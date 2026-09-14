/**
 * The orchestrator: turns a full set of player decisions into one day's result.
 *
 * The chain is deliberately linear so every number is traceable:
 *
 *   forecast fleet ──► planCharging ──────────────► DAY-AHEAD position
 *          │                                             │
 *   + intraday-revealed surprises                         │
 *          ▼                                             ▼
 *   expected actual ──► (× closeFraction) ────────► INTRADAY adjustment
 *                                                        │
 *   + delivery-revealed surprises                        ▼
 *          ▼                                     NOMINATED SCHEDULE
 *   runDelivery ──────────────────────────────────► METERED ACTUAL
 *                                                        │
 *                              actual − nominated  ──►  IMBALANCE  ──► reBAP ──► BRP contract
 */

import { blockOfQh, QH_PER_BLOCK } from "./constants";
import { applySurprises, planCharging, runDelivery, type PassiveBalancingConfig, type PlanMode } from "./depot";
import { computeRebap } from "./rebap";
import { allocateImbalance } from "./settlement";
import type {
  BalancingConfig,
  BalancingOffer,
  BrpOffer,
  DepotConfig,
  FeeConfig,
  PnlLine,
  QuarterHourResult,
  Scenario,
  SimulationResult,
} from "./types";
import { HOURS_PER_QH, QH_PER_DAY } from "./types";

/** Quarter hour at which the intraday-revealed forecast errors become known (11:00). */
export const INTRADAY_REVEAL_QH = 44;

export interface SimulationInput {
  scenario: Scenario;
  depot: DepotConfig;
  brp: BrpOffer;
  fees: FeeConfig;
  balancing: BalancingConfig;
  balancingOffer: BalancingOffer;
  planMode: PlanMode;
  priceThreshold: number;
  /** 0..1 — how much of the revealed forecast error you close in intraday. */
  intradayCloseFraction: number;
  passive: PassiveBalancingConfig;
}

export function simulate(input: SimulationInput): SimulationResult {
  const { scenario, depot, brp, fees, balancing, balancingOffer } = input;
  const points = scenario.points;
  const dayAheadPrices = points.map((p) => p.dayAhead);

  // --- 1. Plan against the forecast ---------------------------------------
  const forecastFleet = applySurprises(depot.trucks, scenario.surprises, []);
  const plan = planCharging(forecastFleet, depot, dayAheadPrices, input.planMode, input.priceThreshold);
  const dayAheadMw = plan.depotMw;

  // --- 2. Intraday: re-forecast, then close some of the gap ---------------
  const intradayFleet = applySurprises(depot.trucks, scenario.surprises, ["intraday"]);
  const flat: PassiveBalancingConfig = { enabled: false, strength: 0 };
  const zeros = new Array(QH_PER_DAY).fill(0);
  const expected = runDelivery(intradayFleet, depot, plan.perTruckKw, flat, zeros, zeros);

  const closable = brp.intradayAccess ? input.intradayCloseFraction : 0;
  const intradayDeltaMw = expected.actualMw.map((a, qh) => (a - dayAheadMw[qh]) * closable);
  const scheduledMw = dayAheadMw.map((v, qh) => v + intradayDeltaMw[qh]);

  // --- 3. Delivery: everything is revealed --------------------------------
  const rebaps = points.map((p) => computeRebap(p, scenario.dimensioned));
  const rebapShortSeries = rebaps.map((r) => r.rebapShort);
  const balanceSeries = points.map((p) => p.balanceGCC);
  const deliveryFleet = applySurprises(depot.trucks, scenario.surprises, ["intraday", "delivery"]);
  const actual = runDelivery(
    deliveryFleet,
    depot,
    plan.perTruckKw,
    input.passive,
    balanceSeries,
    rebapShortSeries,
  );

  // --- 4. Balancing market ------------------------------------------------
  // Capacity revenue is straightforward. Activated energy is settled at the
  // platform marginal price AND neutralised in the balance group, so it never
  // shows up as imbalance — but it does add battery throughput.
  let capacityRevenue = 0;
  let activationRevenue = 0;
  let balancingThroughputKwh = 0;
  const balancingEnergyByQh = new Array(QH_PER_DAY).fill(0);

  if (brp.balancingAccess) {
    for (let b = 0; b < 6; b++) {
      const negMw = balancingOffer.aFrrNeg[b] ?? 0;
      const posMw = balancingOffer.aFrrPos[b] ?? 0;
      capacityRevenue += negMw * 4 * balancing.aFrrCapacityNegEurPerMwH;
      capacityRevenue += posMw * 4 * balancing.aFrrCapacityPosEurPerMwH;

      const negShare = scenario.activationShare.negAfrr[b] ?? 0;
      const posShare = scenario.activationShare.posAfrr[b] ?? 0;

      for (let k = 0; k < QH_PER_BLOCK; k++) {
        const qh = b * QH_PER_BLOCK + k;
        const p = points[qh];
        // Negative activation: you absorb extra energy and pay the negative-direction
        // marginal price for it (which is a receipt when that price is negative).
        const negMwh = negMw * negShare * HOURS_PER_QH;
        const negPrice = p.vwapAfrrNeg !== 0 ? p.vwapAfrrNeg : p.voaaNeg;
        activationRevenue += -negMwh * negPrice;

        // Positive activation: you inject and are paid the positive-direction price.
        const posMwh = posMw * posShare * HOURS_PER_QH;
        const posPrice = p.vwapAfrrPos !== 0 ? p.vwapAfrrPos : p.voaaPos;
        activationRevenue += posMwh * posPrice;

        balancingEnergyByQh[qh] = negMwh - posMwh;
        balancingThroughputKwh += (negMwh + posMwh) * 1000;
      }
    }
    const share = 1 - balancing.aggregatorSharePct;
    capacityRevenue *= share;
    activationRevenue *= share;
  }

  // --- 5. Per quarter hour settlement -------------------------------------
  const perQh: QuarterHourResult[] = [];
  let imbalanceEurTotal = 0;
  let grossImbalanceMwh = 0;
  let absImbalanceMwh = 0;

  for (let qh = 0; qh < QH_PER_DAY; qh++) {
    const scheduledMwh = scheduledMw[qh] * HOURS_PER_QH;
    const actualMwh = actual.actualMw[qh] * HOURS_PER_QH;
    // Balancing activation volume is neutralised in the balance group.
    const rawImbalance = actualMwh - scheduledMwh - balancingEnergyByQh[qh];
    const r = rebaps[qh];
    const alloc = allocateImbalance(rawImbalance, scheduledMwh, r, brp);

    imbalanceEurTotal += alloc.eur;
    grossImbalanceMwh += rawImbalance;
    absImbalanceMwh += Math.abs(rawImbalance);

    perQh.push({
      qh,
      dayAheadMw: dayAheadMw[qh],
      intradayMw: intradayDeltaMw[qh],
      scheduledMw: scheduledMw[qh],
      actualMw: actual.actualMw[qh],
      imbalanceMwh: rawImbalance,
      balancingEnergyMwh: balancingEnergyByQh[qh],
      meanSoc: actual.meanSoc[qh],
      pluggedIn: actual.pluggedIn[qh],
      dayAhead: points[qh].dayAhead,
      idIndex: points[qh].idIndex,
      rebap: r,
      appliedRebap: rawImbalance > 0 ? r.rebapShort : r.rebapLong,
      imbalanceEur: alloc.eur,
    });
  }

  // --- 6. Energy costs ----------------------------------------------------
  let dayAheadCost = 0;
  let dayAheadMwh = 0;
  for (let qh = 0; qh < QH_PER_DAY; qh++) {
    const mwh = dayAheadMw[qh] * HOURS_PER_QH;
    dayAheadMwh += mwh;
    dayAheadCost += mwh * points[qh].dayAhead;
  }

  let intradayCost = 0;
  let intradayMwh = 0;
  let intradayAbsMwh = 0;
  for (let qh = 0; qh < QH_PER_DAY; qh++) {
    const mwh = intradayDeltaMw[qh] * HOURS_PER_QH;
    if (Math.abs(mwh) < 1e-12) continue;
    // Trades are executed shortly after the 11:00 reveal, so quarter hours close
    // to that moment cross a wider spread.
    const near = qh >= INTRADAY_REVEAL_QH && qh < INTRADAY_REVEAL_QH + 8;
    const spread = fees.intradayHalfSpreadEurPerMwh * (near ? fees.lateSpreadMultiplier : 1);
    const price = points[qh].idIndex + Math.sign(mwh) * spread;
    intradayCost += mwh * price;
    intradayMwh += mwh;
    intradayAbsMwh += Math.abs(mwh);
  }

  // --- 7. Volumes, peaks, throughput --------------------------------------
  const deliveredMwh = actual.actualMw.reduce((a, v) => a + Math.max(0, v) * HOURS_PER_QH, 0);
  const peakKw = Math.max(0, ...actual.actualMw) * 1000;
  const throughputKwh = actual.chargedKwh + actual.dischargedKwh + balancingThroughputKwh;

  const tradedAbsMwh = Math.abs(dayAheadMwh) + intradayAbsMwh;

  // --- 8. P&L -------------------------------------------------------------
  const pnl: PnlLine[] = [];
  const push = (
    key: string,
    label: string,
    value: number,
    detail: string,
    group: PnlLine["group"],
  ) => pnl.push({ key, label, value, detail, group });

  push(
    "dayAhead",
    "Day-ahead energy",
    -dayAheadCost,
    `${dayAheadMwh.toFixed(2)} MWh at a volume-weighted ${(dayAheadCost / Math.max(dayAheadMwh, 1e-9)).toFixed(2)} €/MWh`,
    "energy",
  );
  push(
    "intraday",
    "Intraday adjustment",
    -intradayCost,
    intradayAbsMwh < 1e-9
      ? brp.intradayAccess
        ? "no intraday trading — position left open"
        : "this BRP offers no intraday access"
      : `${intradayMwh >= 0 ? "bought" : "sold"} ${Math.abs(intradayMwh).toFixed(2)} MWh net, ${intradayAbsMwh.toFixed(2)} MWh gross across the spread`,
    "energy",
  );
  push(
    "imbalance",
    "Imbalance settlement",
    imbalanceEurTotal,
    `${grossImbalanceMwh >= 0 ? "net short" : "net long"} ${Math.abs(grossImbalanceMwh).toFixed(3)} MWh · ${absImbalanceMwh.toFixed(3)} MWh gross deviation · ${brp.model === "fullService" ? "absorbed by the BRP" : brp.model === "pooled" ? `netted ×${brp.poolNettingFactor}` : "full pass-through"}`,
    "energy",
  );

  const exchangeFees =
    -(Math.abs(dayAheadMwh) * fees.exchangeFeeDayAheadEurPerMwh +
      intradayAbsMwh * fees.exchangeFeeIntradayEurPerMwh +
      tradedAbsMwh * fees.clearingFeeEurPerMwh);
  push("exchange", "Exchange + clearing fees", exchangeFees, `${tradedAbsMwh.toFixed(2)} MWh traded`, "fees");

  push(
    "brpFixed",
    `BRP fixed fee — ${brp.name}`,
    -brp.monthlyFeeEur / 30,
    `${brp.monthlyFeeEur} €/month, pro-rated to one day`,
    "fees",
  );
  push(
    "brpEnergy",
    "BRP energy + execution fee",
    -(deliveredMwh * brp.energyFeeEurPerMwh + tradedAbsMwh * brp.executionFeeEurPerMwh),
    `${brp.energyFeeEurPerMwh} €/MWh delivered + ${brp.executionFeeEurPerMwh} €/MWh traded`,
    "fees",
  );
  if (brp.insurancePremiumEurPerMwh > 0) {
    push(
      "brpPremium",
      "Imbalance absorption premium",
      -deliveredMwh * brp.insurancePremiumEurPerMwh,
      `${brp.insurancePremiumEurPerMwh} €/MWh — the price of not being exposed to the reBAP`,
      "fees",
    );
  }

  push(
    "grid",
    "Grid fees, levies and tax",
    -deliveredMwh * fees.gridAndLeviesEurPerMwh,
    `${fees.gridAndLeviesEurPerMwh} €/MWh on ${deliveredMwh.toFixed(2)} MWh withdrawn`,
    "network",
  );
  push(
    "peak",
    "Peak power charge",
    -(peakKw * fees.peakPowerEurPerKwYear) / 365,
    `${peakKw.toFixed(0)} kW peak at ${fees.peakPowerEurPerKwYear} €/kW·a, pro-rated to one day`,
    "network",
  );

  if (brp.balancingAccess && (capacityRevenue !== 0 || activationRevenue !== 0)) {
    push(
      "balCapacity",
      "Balancing capacity revenue",
      capacityRevenue,
      `net of a ${(balancing.aggregatorSharePct * 100).toFixed(0)} % aggregator share`,
      "flexibility",
    );
    push(
      "balActivation",
      "Balancing activation settlement",
      activationRevenue,
      "activated energy at the PICASSO marginal price, neutralised in the balance group",
      "flexibility",
    );
  }

  push(
    "degradation",
    "Battery degradation",
    -(input.depot.degradationEurPerKwh * throughputKwh) / 2,
    `${throughputKwh.toFixed(0)} kWh throughput at ${input.depot.degradationEurPerKwh} €/kWh, charged once per full cycle`,
    "operations",
  );

  if (actual.failures.length > 0) {
    push(
      "failures",
      "Operational failures",
      -actual.failures.length * fees.operationalFailurePenaltyEur,
      `${actual.failures.length} truck(s) below the required departure SoC`,
      "operations",
    );
  }

  const net = pnl.reduce((a, l) => a + l.value, 0);

  return {
    perQh,
    pnl,
    net,
    totals: {
      dayAheadMwh,
      intradayMwh,
      deliveredMwh,
      grossImbalanceMwh,
      absImbalanceMwh,
      imbalanceRatePct: deliveredMwh > 0 ? (absImbalanceMwh / deliveredMwh) * 100 : 0,
      peakKw,
      throughputKwh,
      dischargedKwh: actual.dischargedKwh,
      failures: actual.failures,
      effectiveEurPerMwh: deliveredMwh > 0 ? -net / deliveredMwh : 0,
      balancingCapacityRevenue: capacityRevenue,
      balancingActivationRevenue: activationRevenue,
    },
  };
}

/**
 * How much balancing capacity could this fleet honestly have offered in each
 * 4-hour block? Used to warn when an offer exceeds what the depot can hold for
 * the whole block — the thing a TSO service run would catch.
 */
export function availableCapacityByBlock(
  scenario: Scenario,
  depot: DepotConfig,
  plannedMw: number[],
): { negMw: number[]; posMw: number[] } {
  const fleet = applySurprises(depot.trucks, scenario.surprises, []);
  const negMw = new Array(6).fill(Infinity);
  const posMw = new Array(6).fill(Infinity);

  for (let qh = 0; qh < QH_PER_DAY; qh++) {
    const b = blockOfQh(qh);
    let pluggedChargeKw = 0;
    let pluggedDischargeKw = 0;
    for (const t of fleet) {
      const inDepot = qh < t.departQh || qh >= t.effectiveReturnQh;
      if (!inDepot) continue;
      pluggedChargeKw += t.maxChargeKw;
      pluggedDischargeKw += depot.v2gEnabled ? t.maxDischargeKw : 0;
    }
    // Negative balancing = charge harder: limited by unused charger and grid headroom.
    const headroomKw = Math.min(
      Math.max(0, pluggedChargeKw - plannedMw[qh] * 1000),
      Math.max(0, depot.gridConnectionKw - plannedMw[qh] * 1000),
    );
    // Positive balancing = charge less or discharge.
    const upKw = plannedMw[qh] * 1000 + pluggedDischargeKw;

    negMw[b] = Math.min(negMw[b], headroomKw / 1000);
    posMw[b] = Math.min(posMw[b], upKw / 1000);
  }
  return {
    negMw: negMw.map((v) => Math.max(0, Math.round(v * 100) / 100)),
    posMw: posMw.map((v) => Math.max(0, Math.round(v * 100) / 100)),
  };
}
