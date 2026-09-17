/**
 * Depot physics and dispatch.
 *
 * Two separate jobs live here:
 *   1. PLANNING  — turn a price curve and a fleet into a charging schedule that
 *      is feasible against every constraint. This becomes the day-ahead purchase
 *      and, after nomination, the Fahrplan.
 *   2. DELIVERY  — run the day for real, with forecast errors, and let operations
 *      override the plan. The gap between the two IS the imbalance.
 *
 * The dispatcher's priority order is deliberate and matches reality:
 *      operations  >  grid connection limit  >  the trading plan
 * A depot that misses a departure has lost far more than any imbalance charge.
 */

import type { DepotConfig, Surprise, TruckSpec } from "./types";
import { HOURS_PER_QH, QH_PER_DAY } from "./types";

export type PlanMode = "cheapest" | "asap" | "flat" | "threshold";

const EPS = 1e-9;

/** A stretch of quarter hours during which a truck is plugged in, ending at a deadline. */
interface ChargingWindow {
  truck: number;
  startQh: number;
  /** Exclusive. The deadline is at this quarter hour. */
  endQh: number;
  /** Grid-side energy needed over the window to hit the target SoC, kWh. */
  needKwh: number;
}

export interface EffectiveTruck extends TruckSpec {
  effectiveReturnQh: number;
  effectiveConsumptionKwh: number;
}

/** Apply the surprises that have been revealed by a given phase. */
export function applySurprises(
  trucks: TruckSpec[],
  surprises: Surprise[],
  revealed: ("intraday" | "delivery")[],
): EffectiveTruck[] {
  return trucks.map((t, i) => {
    // Every matching surprise applies, and they COMPOUND: a truck delayed at
    // the intraday step and delayed again during delivery is late by the sum of
    // both, not by whichever one happened to be listed first.
    const mine = surprises.filter(
      (x) => (x.truck === "all" || x.truck === i) && revealed.includes(x.revealedAt),
    );
    const shiftQh = mine.reduce((a, x) => a + x.returnShiftQh, 0);
    const factor = mine.reduce((a, x) => a * x.consumptionFactor, 1);
    return {
      ...t,
      effectiveReturnQh: Math.min(QH_PER_DAY, t.returnQh + shiftQh),
      effectiveConsumptionKwh: t.shiftConsumptionKwh * factor,
    };
  });
}

/** Is this truck plugged in at this quarter hour? */
export function isPluggedIn(t: EffectiveTruck, qh: number): boolean {
  if (qh < t.departQh) return true;
  if (qh >= t.effectiveReturnQh) return true;
  return false;
}

/**
 * Build the charging windows for a fleet: one before departure, one after return.
 * The pre-departure window must reach the required departure SoC; the post-return
 * window charges back up to the same level ready for the next day.
 */
function buildWindows(trucks: EffectiveTruck[], depot: DepotConfig): ChargingWindow[] {
  const windows: ChargingWindow[] = [];
  const target = depot.socRequiredAtDeparture;

  trucks.forEach((t, i) => {
    // Window A: start of day -> departure.
    if (t.departQh > 0) {
      const deficitSoc = Math.max(0, target - t.startSoc);
      windows.push({
        truck: i,
        startQh: 0,
        endQh: t.departQh,
        needKwh: (deficitSoc * t.capacityKwh) / depot.chargeEfficiency,
      });
    }
    // Window B: return -> end of day.
    // The real deadline is the NEXT day's departure, which is past the horizon.
    // A truck returning at 23:00 legitimately finishes charging overnight, so the
    // need is bounded by what the window can physically deliver rather than
    // counted as a shortfall.
    if (t.effectiveReturnQh < QH_PER_DAY) {
      const socAtReturn = Math.max(0, target - t.effectiveConsumptionKwh / t.capacityKwh);
      const deficitSoc = Math.max(0, target - socAtReturn);
      const deliverableKwh = t.maxChargeKw * (QH_PER_DAY - t.effectiveReturnQh) * HOURS_PER_QH;
      windows.push({
        truck: i,
        startQh: t.effectiveReturnQh,
        endQh: QH_PER_DAY,
        needKwh: Math.min((deficitSoc * t.capacityKwh) / depot.chargeEfficiency, deliverableKwh),
      });
    }
  });

  // Tightest window first. Without this, a truck with a long relaxed window can
  // take the cheapest quarter hours out from under a truck that has only a
  // one-hour window and no alternative — a real scheduling failure, not a
  // rounding issue.
  windows.sort((a, b) => {
    const slack = (w: ChargingWindow) =>
      trucks[w.truck].maxChargeKw * (w.endQh - w.startQh) * HOURS_PER_QH - w.needKwh;
    return slack(a) - slack(b);
  });
  return windows;
}

export interface ChargingPlan {
  /** Per-truck grid-side power, kW. [truck][qh] */
  perTruckKw: number[][];
  /** Depot total, MW per quarter hour. */
  depotMw: number[];
  /** kWh that could not be scheduled — the plan is infeasible by this much. */
  unmetKwh: number;
  /** Quarter hours where the grid connection limit binds. */
  gridBoundQhs: number[];
}

/**
 * Produce a feasible charging plan.
 *
 * Global greedy over (truck, quarter hour) slots. The slot ordering is what the
 * strategy actually is — everything else (power caps, the grid connection limit,
 * per-window energy needs) is identical across strategies, so the comparison
 * between them is clean.
 */
export function planCharging(
  trucks: EffectiveTruck[],
  depot: DepotConfig,
  prices: number[],
  mode: PlanMode,
  thresholdEurPerMwh = 60,
): ChargingPlan {
  const perTruckKw: number[][] = trucks.map(() => new Array(QH_PER_DAY).fill(0));
  const gridUsedKw = new Array(QH_PER_DAY).fill(0);
  const windows = buildWindows(trucks, depot);

  for (const w of windows) {
    const t = trucks[w.truck];
    let remaining = w.needKwh;
    if (remaining <= EPS) continue;

    const slots: number[] = [];
    for (let qh = w.startQh; qh < w.endQh; qh++) slots.push(qh);

    if (mode === "cheapest") {
      slots.sort((a, b) => prices[a] - prices[b] || a - b);
    } else if (mode === "asap") {
      slots.sort((a, b) => a - b);
    } else if (mode === "threshold") {
      slots.sort((a, b) => {
        const ua = prices[a] >= thresholdEurPerMwh ? 1 : 0;
        const ub = prices[b] >= thresholdEurPerMwh ? 1 : 0;
        return ua - ub || prices[a] - prices[b] || a - b;
      });
    } else {
      // flat: spread evenly across the window. Handled below with a fixed rate.
      const hours = (w.endQh - w.startQh) * HOURS_PER_QH;
      const rate = Math.min(t.maxChargeKw, remaining / Math.max(hours, EPS));
      for (const qh of slots) {
        if (remaining <= EPS) break;
        const headroom = Math.max(0, depot.gridConnectionKw - gridUsedKw[qh]);
        const kw = Math.min(rate, headroom, remaining / HOURS_PER_QH);
        perTruckKw[w.truck][qh] += kw;
        gridUsedKw[qh] += kw;
        remaining -= kw * HOURS_PER_QH;
      }
      // Anything left over falls through to a cheapest-first top-up.
      slots.sort((a, b) => prices[a] - prices[b] || a - b);
    }

    for (const qh of slots) {
      if (remaining <= EPS) break;
      const already = perTruckKw[w.truck][qh];
      const truckHeadroom = Math.max(0, t.maxChargeKw - already);
      const gridHeadroom = Math.max(0, depot.gridConnectionKw - gridUsedKw[qh]);
      const kw = Math.min(truckHeadroom, gridHeadroom, remaining / HOURS_PER_QH);
      if (kw <= EPS) continue;
      perTruckKw[w.truck][qh] += kw;
      gridUsedKw[qh] += kw;
      remaining -= kw * HOURS_PER_QH;
    }

  }

  let unmetKwh = 0;
  for (const w of windows) {
    const scheduled = perTruckKw[w.truck]
      .slice(w.startQh, w.endQh)
      .reduce((a, b) => a + b * HOURS_PER_QH, 0);
    // Only count the portion of this window's own need that went unserved.
    unmetKwh += Math.max(0, w.needKwh - scheduled);
  }

  const gridBoundQhs: number[] = [];
  for (let qh = 0; qh < QH_PER_DAY; qh++) {
    if (gridUsedKw[qh] > depot.gridConnectionKw - 1) gridBoundQhs.push(qh);
  }

  return {
    perTruckKw,
    depotMw: gridUsedKw.map((kw) => kw / 1000),
    unmetKwh: Math.max(0, unmetKwh),
    gridBoundQhs,
  };
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export interface PassiveBalancingConfig {
  enabled: boolean;
  /** 0..1 — how much of the grid connection you are willing to swing. */
  strength: number;
}

export interface DeliveryResult {
  /** Depot power actually metered, MW per quarter hour. Positive = drawing. */
  actualMw: number[];
  /** Per-truck SoC at the end of each quarter hour, fraction. [truck][qh] */
  socSeries: number[][];
  /** Per-truck grid-side power, kW. Negative = discharging. [truck][qh] */
  powerSeries: number[][];
  /** Whether each truck was plugged in, per quarter hour. [truck][qh] */
  pluggedSeries: boolean[][];
  /** Number of trucks plugged in, per quarter hour. */
  pluggedIn: number[];
  /** Fleet mean SoC across ALL trucks (including those on the road), per quarter hour. */
  meanSoc: number[];
  /** Trucks that failed to reach the required SoC by departure. */
  failures: { truck: string; qh: number; soc: number }[];
  /** Grid-side kWh charged and discharged over the day. */
  chargedKwh: number;
  dischargedKwh: number;
  /** Quarter hours in which operations forced a deviation from the plan. */
  operationsOverrideQhs: number[];
}

/**
 * Run the day.
 *
 * `plannedPerTruckKw` is the plan from `planCharging`. The dispatcher treats it as
 * a *target*, not a command: a truck that must charge harder to make its departure
 * will charge harder, and that is exactly where imbalance comes from.
 */
export function runDelivery(
  trucks: EffectiveTruck[],
  depot: DepotConfig,
  plannedPerTruckKw: number[][],
  passive: PassiveBalancingConfig,
  balanceGCC: number[],
  rebap: number[],
): DeliveryResult {
  const n = trucks.length;
  const soc = trucks.map((t) => t.startSoc);
  const socSeries: number[][] = trucks.map(() => new Array(QH_PER_DAY).fill(0));
  const powerSeries: number[][] = trucks.map(() => new Array(QH_PER_DAY).fill(0));
  const pluggedSeries: boolean[][] = trucks.map(() => new Array(QH_PER_DAY).fill(false));
  const actualMw = new Array(QH_PER_DAY).fill(0);
  const pluggedIn = new Array(QH_PER_DAY).fill(0);
  const meanSoc = new Array(QH_PER_DAY).fill(0);
  const failures: DeliveryResult["failures"] = [];
  const operationsOverrideQhs: number[] = [];
  let chargedKwh = 0;
  let dischargedKwh = 0;

  const target = depot.socRequiredAtDeparture;

  for (let qh = 0; qh < QH_PER_DAY; qh++) {
    // --- 1. Trucks departing at the start of this quarter hour -------------
    for (let i = 0; i < n; i++) {
      if (trucks[i].departQh === qh) {
        if (soc[i] < target - 0.005) {
          failures.push({ truck: trucks[i].name, qh, soc: soc[i] });
        }
      }
    }

    // --- 2. Who is plugged in, and what does each truck need? --------------
    const desiredKw = new Array(n).fill(0);
    const minKw = new Array(n).fill(0);
    /** Spare charging capability before the deadline, kWh. Lower = more urgent. */
    const slack = new Array(n).fill(Infinity);
    const plugged: boolean[] = [];

    for (let i = 0; i < n; i++) {
      const t = trucks[i];
      const p = isPluggedIn(t, qh);
      plugged.push(p);
      if (!p) continue;

      // Deadline: the next departure. Before departure that is departQh; after
      // return it is the next day's departure, modelled as the end of the day.
      const deadline = qh < t.departQh ? t.departQh : QH_PER_DAY;
      const qhLeft = Math.max(1, deadline - qh);
      const deficitKwh = Math.max(0, (target - soc[i]) * t.capacityKwh) / depot.chargeEfficiency;

      // The non-negotiable floor is only what CANNOT be deferred to a later
      // quarter hour. Anything the truck could still make up later is left to
      // the trading plan — otherwise every deferred plan would be overridden
      // into a trickle charge and the whole point of cheap-hour charging is lost.
      const deferrableKwh = t.maxChargeKw * (qhLeft - 1) * HOURS_PER_QH;
      const headroomKwh = Math.max(0, (1 - soc[i]) * t.capacityKwh) / depot.chargeEfficiency;
      const capKw = Math.min(t.maxChargeKw, headroomKwh / HOURS_PER_QH);

      minKw[i] = Math.min(capKw, Math.max(0, (deficitKwh - deferrableKwh) / HOURS_PER_QH));
      slack[i] = qhLeft * HOURS_PER_QH * t.maxChargeKw - deficitKwh;
      desiredKw[i] = Math.min(capKw, Math.max(plannedPerTruckKw[i]?.[qh] ?? 0, minKw[i]));
    }

    // --- 3. Passive balancing: deliberately lean with the system -----------
    // Only ever within the operational envelope: never below minKw, never past
    // the grid connection, never below the SoC floor.
    let swingKw = 0;
    if (passive.enabled) {
      const room = depot.gridConnectionKw * passive.strength;
      if (balanceGCC[qh] < 0 && rebap[qh] < 0) {
        swingKw = room; // system long and paying you to consume: charge harder
      } else if (balanceGCC[qh] > 0 && rebap[qh] > 0) {
        swingKw = -room; // system short and paying you to inject: back off / discharge
      }
    }

    // --- 4. Allocate, respecting the grid connection limit -----------------
    // Urgency order: the truck with the least slack before its deadline first.
    const order = Array.from({ length: n }, (_, i) => i)
      .filter((i) => plugged[i])
      .sort((a, b) => minKw[b] - minKw[a] || slack[a] - slack[b]);

    let gridLeft = depot.gridConnectionKw;
    const finalKw = new Array(n).fill(0);

    // Pass 1: the non-negotiable minimum.
    for (const i of order) {
      const kw = Math.min(minKw[i], gridLeft);
      finalKw[i] = kw;
      gridLeft -= kw;
    }
    if (gridLeft < -EPS) operationsOverrideQhs.push(qh);

    // Pass 2: top up toward the plan, adjusted by the passive-balancing swing.
    const planTotal = order.reduce((a, i) => a + desiredKw[i], 0);
    const minTotal = order.reduce((a, i) => a + finalKw[i], 0);
    let topUpBudget = Math.max(0, Math.min(gridLeft, planTotal + swingKw - minTotal));

    for (const i of order) {
      if (topUpBudget <= EPS) break;
      const t = trucks[i];
      const headroomKwh = Math.max(0, (1 - soc[i]) * t.capacityKwh) / depot.chargeEfficiency;
      const capKw = Math.min(t.maxChargeKw, headroomKwh / HOURS_PER_QH);
      const extra = Math.min(capKw - finalKw[i], topUpBudget);
      if (extra <= EPS) continue;
      finalKw[i] += extra;
      topUpBudget -= extra;
      gridLeft -= extra;
    }

    // Pass 3: V2G discharge, only if enabled, only when leaning negative, and
    // only from trucks with genuine slack above what their deadline needs.
    if (depot.v2gEnabled && swingKw < 0) {
      let want = -swingKw;
      // Anything already not charged counts toward the swing first.
      want -= Math.max(0, planTotal - order.reduce((a, i) => a + finalKw[i], 0));
      for (const i of order) {
        if (want <= EPS) break;
        const t = trucks[i];
        if (t.maxDischargeKw <= 0) continue;
        const deadline = qh < t.departQh ? t.departQh : QH_PER_DAY;
        const qhLeft = Math.max(1, deadline - qh);
        // Energy we can give up and still recharge to target before the deadline.
        const rechargeCapKwh = t.maxChargeKw * qhLeft * HOURS_PER_QH * depot.chargeEfficiency;
        const spareKwh = Math.max(
          0,
          Math.min(
            (soc[i] - depot.socFloor) * t.capacityKwh,
            (soc[i] - target) * t.capacityKwh + rechargeCapKwh,
          ),
        );
        if (spareKwh <= EPS) continue;
        const kw = Math.min(t.maxDischargeKw, want, (spareKwh * depot.dischargeEfficiency) / HOURS_PER_QH);
        if (kw <= EPS) continue;
        finalKw[i] -= kw;
        want -= kw;
      }
    }

    // --- 5. Advance state --------------------------------------------------
    let depotKw = 0;
    for (let i = 0; i < n; i++) {
      const t = trucks[i];
      if (plugged[i]) {
        const kw = finalKw[i];
        if (kw >= 0) {
          const deltaKwh = kw * HOURS_PER_QH * depot.chargeEfficiency;
          soc[i] = Math.min(1, soc[i] + deltaKwh / t.capacityKwh);
          chargedKwh += kw * HOURS_PER_QH;
        } else {
          const gridKwh = -kw * HOURS_PER_QH;
          const batteryKwh = gridKwh / depot.dischargeEfficiency;
          soc[i] = Math.max(depot.socFloor, soc[i] - batteryKwh / t.capacityKwh);
          dischargedKwh += gridKwh;
        }
        depotKw += kw;
        powerSeries[i][qh] = kw;
        pluggedSeries[i][qh] = true;
        pluggedIn[qh]++;
      } else {
        // On the road: drain at a constant rate over the shift.
        const shiftQhs = Math.max(1, t.effectiveReturnQh - t.departQh);
        soc[i] = Math.max(0, soc[i] - t.effectiveConsumptionKwh / shiftQhs / t.capacityKwh);
      }
      socSeries[i][qh] = soc[i];
    }

    actualMw[qh] = depotKw / 1000;
    meanSoc[qh] = soc.reduce((a, b) => a + b, 0) / n;
  }

  return {
    actualMw,
    socSeries,
    powerSeries,
    pluggedSeries,
    pluggedIn,
    meanSoc,
    failures,
    chargedKwh,
    dischargedKwh,
    operationsOverrideQhs,
  };
}
