/**
 * Default parameters. Every number here is exposed in the UI and every number
 * here is an assumption — see energy-markets/docs/06-depot-participation-and-economics.md
 * for where each one comes from and how sensitive the result is to it.
 */

import type { BalancingConfig, BalancingOffer, BrpOffer, DepotConfig, FeeConfig, TruckSpec } from "./types";

/** Six 4-hour balancing capacity blocks per day, matching the German RLM products. */
export const BLOCK_LABELS = ["00–04", "04–08", "08–12", "12–16", "16–20", "20–24"];
export const QH_PER_BLOCK = 16;

export function blockOfQh(qh: number): number {
  return Math.floor(qh / QH_PER_BLOCK);
}

/**
 * Ten trucks in two shift groups.
 *   - Six on an early shift: out 06:00 → 16:00.
 *   - Four on a late shift:  out 14:00 → 23:00.
 * The late group is the interesting one: it is plugged in through the midday
 * solar trough, which is where most of the arbitrage value lives.
 */
export const DEFAULT_TRUCKS: TruckSpec[] = [
  ...Array.from({ length: 6 }, (_, i) => ({
    id: i,
    name: `Truck ${i + 1}`,
    capacityKwh: 540,
    maxChargeKw: 350,
    maxDischargeKw: 200,
    departQh: 24, // 06:00
    returnQh: 64, // 16:00
    shiftConsumptionKwh: 380,
    startSoc: 0.42 + i * 0.03,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: 6 + i,
    name: `Truck ${7 + i}`,
    capacityKwh: 540,
    maxChargeKw: 350,
    maxDischargeKw: 200,
    departQh: 56, // 14:00
    returnQh: 92, // 23:00
    shiftConsumptionKwh: 340,
    startSoc: 0.5 + i * 0.04,
  })),
];

export const DEFAULT_DEPOT: DepotConfig = {
  trucks: DEFAULT_TRUCKS,
  gridConnectionKw: 1600,
  chargeEfficiency: 0.94,
  dischargeEfficiency: 0.94,
  socFloor: 0.15,
  socRequiredAtDeparture: 0.9,
  degradationEurPerKwh: 0.04,
  v2gEnabled: false,
};

export const DEFAULT_FEES: FeeConfig = {
  exchangeFeeDayAheadEurPerMwh: 0.06,
  exchangeFeeIntradayEurPerMwh: 0.12,
  clearingFeeEurPerMwh: 0.035,
  intradayHalfSpreadEurPerMwh: 1.5,
  lateSpreadMultiplier: 1.8,
  gridAndLeviesEurPerMwh: 95,
  peakPowerEurPerKwYear: 120,
  operationalFailurePenaltyEur: 1500,
};

/**
 * Balancing-market parameters. Participation in FCR / aFRR / mFRR is OUT OF SCOPE for
 * this project, so no capacity is ever offered and these values do not affect any result.
 * They are kept so the feature can be restored by re-adding the offer UI to PhaseDayAhead.
 */
export const DEFAULT_BALANCING: BalancingConfig = {
  aFrrCapacityNegEurPerMwH: 12,
  aFrrCapacityPosEurPerMwH: 18,
  mFrrCapacityNegEurPerMwH: 3,
  mFrrCapacityPosEurPerMwH: 6,
  aggregatorSharePct: 0.25,
};

/** The offer the simulator always uses: nothing. See DEFAULT_BALANCING. */
export const EMPTY_BALANCING_OFFER: BalancingOffer = {
  aFrrNeg: [0, 0, 0, 0, 0, 0],
  aFrrPos: [0, 0, 0, 0, 0, 0],
};

/**
 * Three BRP offers spanning the three commercial models that actually exist.
 * See energy-markets/docs/02-market-roles.md §2.2.
 */
export const BRP_OFFERS: BrpOffer[] = [
  {
    id: "basis",
    name: "Stadtwerke Basis",
    tagline: "Cheap headline fee. You own every euro of imbalance risk.",
    model: "passThrough",
    monthlyFeeEur: 250,
    energyFeeEurPerMwh: 1.5,
    executionFeeEurPerMwh: 0.5,
    poolNettingFactor: 1.0,
    toleranceBand: 0,
    outOfBandMultiplier: 1,
    outOfBandFlatEurPerMwh: 0,
    creditPassThrough: 1.0,
    insurancePremiumEurPerMwh: 0,
    intradayAccess: false,
    balancingAccess: false,
    collateralEur: 8000,
    nominationCutoff: "13:00",
  },
  {
    id: "flexpool",
    name: "FlexPool Partner",
    tagline: "Your deviation is netted against the pool first, and you get intraday access.",
    model: "pooled",
    monthlyFeeEur: 600,
    energyFeeEurPerMwh: 2.8,
    executionFeeEurPerMwh: 0.5,
    poolNettingFactor: 0.55,
    toleranceBand: 0.05,
    outOfBandMultiplier: 1.5,
    outOfBandFlatEurPerMwh: 0,
    creditPassThrough: 1.0,
    insurancePremiumEurPerMwh: 0,
    intradayAccess: true,
    balancingAccess: true,
    collateralEur: 15000,
    nominationCutoff: "13:45",
  },
  {
    id: "greentrade",
    name: "GreenTrade Full-Service",
    tagline: "Imbalance absorbed at a fixed premium — and a 40 % haircut on your credits.",
    model: "fullService",
    monthlyFeeEur: 1200,
    energyFeeEurPerMwh: 4.5,
    executionFeeEurPerMwh: 0.5,
    poolNettingFactor: 0,
    toleranceBand: 0.1,
    outOfBandMultiplier: 1,
    outOfBandFlatEurPerMwh: 120,
    creditPassThrough: 0.6,
    insurancePremiumEurPerMwh: 3.5,
    intradayAccess: true,
    balancingAccess: true,
    collateralEur: 25000,
    nominationCutoff: "14:00",
  },
];

export function getBrp(id: string): BrpOffer {
  return BRP_OFFERS.find((b) => b.id === id) ?? BRP_OFFERS[0];
}

/** Chart palette — validated with the dataviz skill's validator (all-pairs, both modes). */
export const SERIES = {
  dayAhead: "var(--series-1)",
  intraday: "var(--series-2)",
  rebap: "var(--series-3)",
} as const;
