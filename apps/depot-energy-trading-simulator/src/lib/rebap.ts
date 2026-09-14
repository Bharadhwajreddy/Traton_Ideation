/**
 * reBAP engine — the German uniform imbalance price.
 *
 * This file implements, formula for formula, the German TSOs' model description
 * "Calculation of the uniform imbalance price (reBAP) across Germany's 4 LFC
 * areas", valid from 01.11.2023, which implements BNetzA decisions BK6-21-192
 * (ISHM), BK6-12-024, BK6-19-217, BK6-19-552, BK6-20-345 and BK6-22-162.
 *
 * Section numbers in the comments refer to ../../../energy-markets/docs/05-imbalance-pricing-rebap.md,
 * which mirrors the source document's own chapters.
 *
 * Nothing here is approximated. If a number looks strange, it is because the real
 * mechanism is strange.
 */

import type { DimensionedReserves, RebapBreakdown, ScenarioPoint } from "./types";

/** Highest permissible bid price in intraday exchange trading, €/MWh. */
export const INTRADAY_BID_CAP = 9999;

/** Module 2 only couples once the index reaches this traded volume, MW. */
export const ID_INDEX_MIN_VOLUME_MW = 500;

/** 500 MW held for one quarter hour = 125 MWh. The ΔP formula is written in MWh. */
const DELTA_P_REFERENCE_MWH = 125;

/** Module 2's minimum distance floor, €/MWh. */
const DELTA_P_FLOOR = 10;

/** Module 2's minimum distance as a share of |ID AEP|. */
const DELTA_P_SHARE = 0.25;

/** Module 3's dead band, as a share of the dimensioned FRR. */
const SCARCITY_DEAD_BAND_SHARE = 0.8;

const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Module 1 — base component (doc 05 §5.3).
 *
 * Volume-weighted combination of the PICASSO (aFRR) and MARI (mFRR) marginal
 * prices for the relevant direction, with the four-way case distinction and the
 * Value of Avoided Activation fallback.
 *
 * A VWAP of exactly 0 encodes "no activation of this product in this direction"
 * — the same convention the source document uses ("= Zero").
 */
export function module1(p: ScenarioPoint): number | null {
  if (p.balanceGCC === 0) return null; // undefined when the system is exactly flat

  const short = p.balanceGCC > 0;
  const vwapAfrr = short ? p.vwapAfrrPos : p.vwapAfrrNeg;
  const vwapMfrr = short ? p.vwapMfrrPos : p.vwapMfrrNeg;
  const sdAfrr = short ? p.sdAfrrPos : p.sdAfrrNeg;
  const sdMfrr = short ? p.sdMfrrPos : p.sdMfrrNeg;
  const voaa = short ? p.voaaPos : p.voaaNeg;

  // Case i: nothing activated in either product -> Value of Avoided Activation.
  if (vwapAfrr === 0 && vwapMfrr === 0) return round2(voaa);
  // Case ii: no aFRR -> mFRR price alone.
  if (vwapAfrr === 0) return round2(vwapMfrr);
  // Case iii: no mFRR -> aFRR price alone.
  if (vwapMfrr === 0) return round2(vwapAfrr);
  // Case iv: both -> volume-weighted by satisfied demand.
  const denom = sdAfrr + sdMfrr;
  if (denom === 0) return round2(voaa);
  return round2((vwapAfrr * sdAfrr + vwapMfrr * sdMfrr) / denom);
}

/**
 * Module 2's minimum distance ΔP (doc 05 §5.4, Formula 3).
 *
 * ΔP = max{ 10 €/MWh · min(125 MWh, |Balance|) / 125 MWh ,
 *           |ID_AEP| · min(125 MWh, |Balance|) · 0.25 / 125 MWh }
 *
 * `balanceGCC` arrives in MW; the formula is in MWh over a quarter hour.
 */
export function minimumDistance(idIndex: number, balanceGccMw: number): number {
  const balanceMwh = Math.abs(balanceGccMw) * 0.25;
  const clamped = Math.min(DELTA_P_REFERENCE_MWH, balanceMwh);
  const scale = clamped / DELTA_P_REFERENCE_MWH;
  return Math.max(DELTA_P_FLOOR * scale, Math.abs(idIndex) * DELTA_P_SHARE * scale);
}

/**
 * Module 2 — incentivising component (doc 05 §5.4).
 *
 * Returns null when the intraday index did not reach 500 MW of traded volume, in
 * which case no imbalance price coupling takes place at all.
 */
export function module2(p: ScenarioPoint): { value: number | null; deltaP: number; coupled: boolean } {
  const coupled = p.idVolume >= ID_INDEX_MIN_VOLUME_MW;
  if (!coupled) return { value: null, deltaP: 0, coupled: false };

  const deltaP = minimumDistance(p.idIndex, p.balanceGCC);
  let value: number;
  if (p.balanceGCC > 0) value = p.idIndex + deltaP;
  else if (p.balanceGCC < 0) value = p.idIndex - deltaP;
  else value = p.idIndex;

  return { value: round2(value), deltaP: round2(deltaP), coupled: true };
}

/**
 * Module 3 — scarcity component (doc 05 §5.5).
 *
 * A parabola anchored on Module 2, rising toward 2 × the intraday bid cap at the
 * point where every reserve is exhausted. Only applies once |Balance_GCC| reaches
 * 80 % of the dimensioned FRR in the relevant direction.
 */
export function module3(
  p: ScenarioPoint,
  dim: DimensionedReserves,
  m2: number | null,
): number | null {
  if (p.balanceGCC === 0) return null;

  const pDbPos = SCARCITY_DEAD_BAND_SHARE * (dim.aFrrPos + dim.mFrrPos);
  const pDbNeg = -SCARCITY_DEAD_BAND_SHARE * (dim.aFrrNeg + dim.mFrrNeg);
  const pResPos = dim.aFrrPos + dim.mFrrPos + dim.disconnectableLoads + dim.capacityReserve;
  const pResNeg = -(dim.aFrrNeg + dim.mFrrNeg + dim.disconnectableLoads + dim.capacityReserve);

  const anchor = m2 ?? 0;

  if (p.balanceGCC >= pDbPos) {
    const span = pResPos - pDbPos;
    if (span <= 0) return null;
    const t = (p.balanceGCC - pDbPos) / span;
    const head = m2 === null ? 2 * INTRADAY_BID_CAP : 2 * INTRADAY_BID_CAP - anchor;
    return round2((m2 === null ? 0 : anchor) + head * t * t);
  }

  if (p.balanceGCC <= pDbNeg) {
    const span = pResNeg - pDbNeg;
    if (span === 0) return null;
    const t = (p.balanceGCC - pDbNeg) / span;
    const head = m2 === null ? -2 * INTRADAY_BID_CAP : -2 * INTRADAY_BID_CAP - anchor;
    return round2((m2 === null ? 0 : anchor) + head * t * t);
  }

  return null;
}

/**
 * The full reBAP for one quarter hour (doc 05 §5.1, §5.6).
 *
 *   Balance_GCC > 0  ->  max of the defined modules
 *   Balance_GCC < 0  ->  min of the defined modules
 *   Balance_GCC = 0  ->  Module 2 alone
 *
 * Plus the KapResV § 32 asymmetric case, the only quarter hour in which the
 * German imbalance price differs between short and long balance groups.
 */
export function computeRebap(p: ScenarioPoint, dim: DimensionedReserves): RebapBreakdown {
  const m1 = module1(p);
  const { value: m2, deltaP, coupled } = module2(p);
  const m3 = module3(p, dim, m2);

  const candidates: { key: RebapBreakdown["binding"]; value: number }[] = [];
  if (m1 !== null) candidates.push({ key: "module1", value: m1 });
  if (m2 !== null) candidates.push({ key: "module2", value: m2 });
  if (m3 !== null) candidates.push({ key: "module3", value: m3 });

  let price: number;
  let binding: RebapBreakdown["binding"];

  if (p.balanceGCC === 0) {
    // Modules 1 and 3 are undefined; Module 2 alone determines the price.
    price = m2 ?? 0;
    binding = m2 === null ? "undefined" : "module2";
  } else if (candidates.length === 0) {
    price = 0;
    binding = "undefined";
  } else if (p.balanceGCC > 0) {
    const best = candidates.reduce((a, b) => (b.value > a.value ? b : a));
    price = best.value;
    binding = best.key;
  } else {
    const best = candidates.reduce((a, b) => (b.value < a.value ? b : a));
    price = best.value;
    binding = best.key;
  }

  // KapResV § 26 / § 32: with the capacity reserve activated and the system short
  // beyond all available positive FRR, short balance groups pay at least twice the
  // intraday bid cap while long balance groups settle at the normal price.
  let rebapShort = price;
  const rebapLong = price;
  let asymmetric = false;

  if (
    p.capacityReserveActivated &&
    p.balanceGCC > dim.aFrrPos + dim.mFrrPos &&
    price < INTRADAY_BID_CAP * 2
  ) {
    rebapShort = INTRADAY_BID_CAP * 2;
    asymmetric = true;
    binding = "capacityReserve";
  }

  return {
    qh: p.qh,
    balanceGCC: p.balanceGCC,
    module1: m1,
    module2: m2,
    module3: m3,
    deltaP,
    coupled,
    binding,
    asymmetric,
    rebapShort: round2(rebapShort),
    rebapLong: round2(rebapLong),
  };
}

/**
 * The four payment directions (doc 03 §3.5).
 *
 * `imbalanceMwh` uses the depot convention: positive = drew MORE than nominated,
 * so the balance group is SHORT. Returns € from the BRP's point of view —
 * positive means money flows TO you.
 */
export function imbalanceSettlement(imbalanceMwh: number, r: RebapBreakdown): number {
  if (imbalanceMwh === 0) return 0;
  const short = imbalanceMwh > 0;
  const price = short ? r.rebapShort : r.rebapLong;
  // Short group with positive price -> you pay.  Long group with positive price -> you are paid.
  // Both directions fall out of a single signed product:
  return -imbalanceMwh * price;
}

export function describePaymentDirection(imbalanceMwh: number, price: number): string {
  if (imbalanceMwh === 0) return "flat — no settlement";
  const short = imbalanceMwh > 0;
  if (price > 0) return short ? "positive reBAP, short → you pay" : "positive reBAP, long → you are paid";
  if (price < 0) return short ? "negative reBAP, short → you are paid" : "negative reBAP, long → you pay";
  return "reBAP zero — no settlement";
}
