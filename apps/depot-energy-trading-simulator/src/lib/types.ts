/**
 * Domain types for the German depot energy-trading simulator.
 *
 * Conventions used everywhere in this codebase:
 *   - Time base is the quarter hour (QH), index 0..95, matching the German
 *     imbalance settlement period and (since 01.10.2025) the day-ahead MTU.
 *   - Power is in MW. Energy is in MWh. 1 MW held for one QH = 0.25 MWh.
 *   - Prices are €/MWh.
 *   - Depot power sign convention: POSITIVE = drawing from the grid (charging),
 *     NEGATIVE = injecting into the grid (V2G discharge).
 *   - System imbalance sign convention (balanceGCC): POSITIVE = the German
 *     control block is SHORT (under-supplied). This matches the TSOs' reBAP
 *     model description exactly.
 */

export const QH_PER_DAY = 96;
export const HOURS_PER_QH = 0.25;

export type Phase = "setup" | "dayAhead" | "intraday" | "delivery" | "settlement";

// ---------------------------------------------------------------------------
// Scenario data (one simulated German delivery day)
// ---------------------------------------------------------------------------

/** Market and system state for a single quarter hour. */
export interface ScenarioPoint {
  qh: number;
  /** Day-ahead auction clearing price, €/MWh. */
  dayAhead: number;
  /** The ID AEP intraday price index used by reBAP Module 2, €/MWh. */
  idIndex: number;
  /** Traded volume behind that index, MW. Module 2 only couples at >= 500 MW. */
  idVolume: number;
  /** Balance_GCC in MW. Positive = system short. */
  balanceGCC: number;

  /** PICASSO volume-weighted average aFRR marginal price, positive direction. 0 = no activation. */
  vwapAfrrPos: number;
  /** PICASSO VWAP, negative direction. 0 = no activation. */
  vwapAfrrNeg: number;
  /** MARI VWAP mFRR, positive direction. 0 = no activation. */
  vwapMfrrPos: number;
  /** MARI VWAP mFRR, negative direction. 0 = no activation. */
  vwapMfrrNeg: number;

  /** Satisfied demand (activated + exchanged), MWh, per platform and direction. */
  sdAfrrPos: number;
  sdAfrrNeg: number;
  sdMfrrPos: number;
  sdMfrrNeg: number;

  /** Value of Avoided Activation, €/MWh, per direction. */
  voaaPos: number;
  voaaNeg: number;

  /** True in the quarter hours where the capacity reserve (KapResV § 26) is activated. */
  capacityReserveActivated: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  subtitle: string;
  /** What this day is designed to teach. */
  teaches: string;
  points: ScenarioPoint[];
  /** Dimensioned reserve powers for this day, MW. Feed Module 3's dead band. */
  dimensioned: DimensionedReserves;
  /** Reality-vs-forecast surprises revealed during the intraday and delivery phases. */
  surprises: Surprise[];
  /** Share of offered balancing capacity actually activated, per 4h block and direction. */
  activationShare: { posAfrr: number[]; negAfrr: number[] };
}

export interface DimensionedReserves {
  aFrrPos: number;
  aFrrNeg: number;
  mFrrPos: number;
  mFrrNeg: number;
  /** Contracted disconnectable loads (AbLaV), MW. */
  disconnectableLoads: number;
  /** Contracted capacity reserve (KapResV), MW. */
  capacityReserve: number;
}

/** A forecast error that is revealed part-way through the day. */
export interface Surprise {
  /**
   * Which truck this happens to. `"all"` means the whole fleet, together —
   * which is the only value used by the shipped scenarios, because the ten
   * trucks are meant to stay identical all day. Per-truck indices still work
   * if you ever want to break the fleet up.
   */
  truck: number | "all";
  /** Phase at which the player learns about it. */
  revealedAt: "intraday" | "delivery";
  /** Shift in return time, in quarter hours. Positive = late. */
  returnShiftQh: number;
  /** Multiplier on the shift's energy consumption. 1.0 = as forecast. */
  consumptionFactor: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Depot
// ---------------------------------------------------------------------------

export interface TruckSpec {
  id: number;
  name: string;
  /** Usable battery capacity, kWh. */
  capacityKwh: number;
  /** Maximum charging power, kW. */
  maxChargeKw: number;
  /** Maximum V2G discharge power, kW. 0 disables V2G for this truck. */
  maxDischargeKw: number;
  /** Departure quarter hour (leaves the depot). */
  departQh: number;
  /** Return quarter hour (plugs back in). */
  returnQh: number;
  /** Forecast energy used on the shift, kWh. */
  shiftConsumptionKwh: number;
  /** State of charge at the very start of the day, fraction 0..1. */
  startSoc: number;
}

export interface DepotConfig {
  trucks: TruckSpec[];
  /** Grid connection limit, kW. Binds the sum of all charging power. */
  gridConnectionKw: number;
  /** Charging efficiency, 0..1 (grid -> battery). */
  chargeEfficiency: number;
  /** Discharging efficiency, 0..1 (battery -> grid). */
  dischargeEfficiency: number;
  /** Never discharge below this SoC, fraction. */
  socFloor: number;
  /** Required SoC at departure, fraction. */
  socRequiredAtDeparture: number;
  /** Battery degradation cost, €/kWh of throughput (halved per cycle in settlement). */
  degradationEurPerKwh: number;
  /** Enable V2G discharge at all. */
  v2gEnabled: boolean;
}

// ---------------------------------------------------------------------------
// BRP contract
// ---------------------------------------------------------------------------

export type BrpModel = "passThrough" | "pooled" | "fullService";

export interface BrpOffer {
  id: string;
  name: string;
  tagline: string;
  model: BrpModel;
  /** Fixed fee, €/month. Pro-rated to the day at /30 in settlement. */
  monthlyFeeEur: number;
  /** Variable fee, €/MWh of gross traded volume. */
  energyFeeEurPerMwh: number;
  /** Execution fee on each trade, €/MWh. */
  executionFeeEurPerMwh: number;
  /** Share of your raw imbalance that survives pool netting, 0..1. 1 = full pass-through. */
  poolNettingFactor: number;
  /** Tolerance band as a fraction of the scheduled volume. 0 = none. */
  toleranceBand: number;
  /** Multiplier applied to reBAP charges outside the tolerance band. */
  outOfBandMultiplier: number;
  /** Flat penalty applied outside the band instead of reBAP, €/MWh. 0 = not used. */
  outOfBandFlatEurPerMwh: number;
  /** Share of imbalance CREDITS (money owed to you) actually passed through, 0..1. */
  creditPassThrough: number;
  /** Fixed premium charged instead of imbalance exposure, €/MWh of volume. */
  insurancePremiumEurPerMwh: number;
  /** Market access granted. */
  intradayAccess: boolean;
  balancingAccess: boolean;
  /** Collateral the BRP requires from you, €. Not a cost — shown as working capital. */
  collateralEur: number;
  /** The BRP's own nomination cut-off, as a clock time string. Earlier than the TSO's 14:30. */
  nominationCutoff: string;
}

// ---------------------------------------------------------------------------
// Fees and market parameters
// ---------------------------------------------------------------------------

export interface FeeConfig {
  exchangeFeeDayAheadEurPerMwh: number;
  exchangeFeeIntradayEurPerMwh: number;
  clearingFeeEurPerMwh: number;
  /** Half-spread you cross in continuous intraday, €/MWh. */
  intradayHalfSpreadEurPerMwh: number;
  /** Multiplier on the half-spread in the last few quarter hours before gate closure. */
  lateSpreadMultiplier: number;
  /** Grid fees + levies + electricity tax, €/MWh of consumption. */
  gridAndLeviesEurPerMwh: number;
  /** Annual peak-power charge, €/kW·a. Charged on the day's peak, pro-rated /365. */
  peakPowerEurPerKwYear: number;
  /** Cost of a truck failing to reach its required SoC by departure, €. */
  operationalFailurePenaltyEur: number;
}

export interface BalancingConfig {
  /** Capacity prices, €/MW per hour of the 4h block. */
  aFrrCapacityNegEurPerMwH: number;
  aFrrCapacityPosEurPerMwH: number;
  mFrrCapacityNegEurPerMwH: number;
  mFrrCapacityPosEurPerMwH: number;
  /** Share of balancing revenue the aggregator keeps, 0..1. */
  aggregatorSharePct: number;
}

/** Offered balancing capacity, per 4-hour block (6 blocks), MW. */
export interface BalancingOffer {
  aFrrNeg: number[];
  aFrrPos: number[];
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface RebapBreakdown {
  qh: number;
  balanceGCC: number;
  module1: number | null;
  module2: number | null;
  module3: number | null;
  /** The minimum distance ΔP used by Module 2, €/MWh. */
  deltaP: number;
  /** Whether Module 2 coupled at all (needs >= 500 MW of index volume). */
  coupled: boolean;
  /** Which module set the final price. */
  binding: "module1" | "module2" | "module3" | "capacityReserve" | "undefined";
  /** True where the KapResV asymmetric rule applies. */
  asymmetric: boolean;
  /** Price a SHORT balance group settles at, €/MWh. */
  rebapShort: number;
  /** Price a LONG balance group settles at, €/MWh. Equal to rebapShort except under KapResV. */
  rebapLong: number;
}

export interface QuarterHourResult {
  qh: number;
  /** Depot power bought in the day-ahead auction, MW. */
  dayAheadMw: number;
  /** Net intraday adjustment, MW. Positive = bought more. */
  intradayMw: number;
  /** Depot power finally nominated (day-ahead + intraday), MW. Positive = drawing. */
  scheduledMw: number;
  /** Depot power actually metered, MW. */
  actualMw: number;
  /** Deviation, MWh. Positive = drew MORE than nominated => balance group SHORT. */
  imbalanceMwh: number;
  /** Balancing energy delivered under activation, MWh. Neutralised in the balance group. */
  balancingEnergyMwh: number;
  /** Fleet mean state of charge, fraction. */
  meanSoc: number;
  /** Trucks plugged in during this quarter hour. */
  pluggedIn: number;
  dayAhead: number;
  idIndex: number;
  rebap: RebapBreakdown;
  /** The reBAP actually applied to this depot's deviation, €/MWh. */
  appliedRebap: number;
  /** Imbalance settlement for this quarter hour, €. Positive = you receive. */
  imbalanceEur: number;
}

export interface PnlLine {
  key: string;
  label: string;
  /** € — negative is a cost, positive is revenue. */
  value: number;
  detail: string;
  group: "energy" | "fees" | "network" | "flexibility" | "operations";
}

export interface SimulationResult {
  perQh: QuarterHourResult[];
  /** Per-truck state through the day, for the depot animation. [truck][qh] */
  fleet: {
    name: string;
    soc: number[];
    powerKw: number[];
    pluggedIn: boolean[];
  }[];
  pnl: PnlLine[];
  net: number;
  totals: {
    dayAheadMwh: number;
    intradayMwh: number;
    deliveredMwh: number;
    grossImbalanceMwh: number;
    absImbalanceMwh: number;
    imbalanceRatePct: number;
    peakKw: number;
    throughputKwh: number;
    dischargedKwh: number;
    failures: { truck: string; qh: number; soc: number }[];
    effectiveEurPerMwh: number;
    balancingCapacityRevenue: number;
    balancingActivationRevenue: number;
  };
}
