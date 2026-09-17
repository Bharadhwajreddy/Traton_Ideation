/**
 * Synthetic German delivery days.
 *
 * IMPORTANT: these are hand-built, deterministic, calibrated-to-plausible price
 * days. They are NOT historical data and must not be cited as such. They exist so
 * the simulator is reproducible offline and so each scenario isolates one lesson.
 *
 * To swap in real data, produce the same `ScenarioPoint[]` shape from:
 *   - day-ahead prices                → ENTSO-E Transparency Platform / SMARD
 *   - intraday index + volume         → EPEX SPOT continuous trades
 *   - Balance_GCC (NRV-Saldo)         → netztransparenz.de
 *   - PICASSO/MARI VWAPs + satisfied  → netztransparenz.de / regelleistung.net
 *     demand, VoAA
 * Nothing else in the codebase needs to change.
 */

import type { DimensionedReserves, Scenario, ScenarioPoint, Surprise } from "./types";
import { QH_PER_DAY } from "./types";

/** Deterministic PRNG so every replay of a scenario is identical. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 0..1 bump centred on `centre` quarter hours with the given width. */
function bump(qh: number, centre: number, width: number): number {
  const x = (qh - centre) / width;
  return Math.exp(-x * x);
}

/** 2023-ish German dimensioning. Drives Module 3's dead band. */
const DIMENSIONED_2023: DimensionedReserves = {
  aFrrPos: 1922,
  aFrrNeg: 1842,
  mFrrPos: 681,
  mFrrNeg: 372,
  disconnectableLoads: 750,
  capacityReserve: 1056,
};

interface DayShape {
  seed: number;
  /** Day-ahead price for a given quarter hour. */
  dayAhead: (qh: number) => number;
  /** System imbalance in MW, positive = short. */
  balance: (qh: number, rnd: () => number) => number;
  /** Quarter hours in which the capacity reserve fires. */
  capResQhs?: number[];
  /** Force the intraday index below 500 MW in these quarter hours (Module 2 decouples). */
  thinLiquidityQhs?: number[];
}

function buildPoints(shape: DayShape): ScenarioPoint[] {
  const rnd = mulberry32(shape.seed);
  const points: ScenarioPoint[] = [];

  for (let qh = 0; qh < QH_PER_DAY; qh++) {
    const da = shape.dayAhead(qh);
    const balanceGCC = Math.round(shape.balance(qh, rnd));
    const short = balanceGCC > 0;

    // The intraday index tracks day-ahead with a liquidity-driven wobble and a
    // systematic lean toward the direction the system ends up in.
    const lean = (balanceGCC / 1000) * 6;
    const idIndex = Math.round((da + lean + (rnd() - 0.5) * 9) * 100) / 100;

    const thin = shape.thinLiquidityQhs?.includes(qh) ?? false;
    // Liquidity is deepest around the peaks and thinnest overnight.
    const idVolume = thin
      ? Math.round(180 + rnd() * 260)
      : Math.round(620 + 900 * bump(qh, 34, 16) + 900 * bump(qh, 74, 12) + rnd() * 220);

    // Platform prices. The activated direction is the one the system needs.
    // A VWAP of exactly 0 is the source document's encoding for "no activation".
    const mag = Math.min(1, Math.abs(balanceGCC) / 1400);
    const afrrSpread = 18 + 140 * mag * mag;
    const mfrrSpread = 26 + 190 * mag * mag;

    // aFRR activates in almost every quarter hour; mFRR only when the imbalance is real.
    const afrrActive = Math.abs(balanceGCC) > 60;
    const mfrrActive = Math.abs(balanceGCC) > 520;

    const vwapAfrrPos = short && afrrActive ? Math.round((da + afrrSpread) * 100) / 100 : 0;
    const vwapAfrrNeg = !short && afrrActive ? Math.round((da - afrrSpread) * 100) / 100 : 0;
    const vwapMfrrPos = short && mfrrActive ? Math.round((da + mfrrSpread) * 100) / 100 : 0;
    const vwapMfrrNeg = !short && mfrrActive ? Math.round((da - mfrrSpread) * 100) / 100 : 0;

    const absMwh = (Math.abs(balanceGCC) * 0.25) || 0;
    const sdAfrr = afrrActive ? Math.round(absMwh * 0.72 * 10) / 10 : 0;
    const sdMfrr = mfrrActive ? Math.round(absMwh * 0.38 * 10) / 10 : 0;

    // Value of Avoided Activation: mean cheapest available aFRR bid. Used when
    // nothing was activated in either direction.
    const voaaPos = Math.round((da + 11 + rnd() * 6) * 100) / 100;
    const voaaNeg = Math.round((da - 11 - rnd() * 6) * 100) / 100;

    points.push({
      qh,
      dayAhead: Math.round(da * 100) / 100,
      idIndex,
      idVolume,
      balanceGCC,
      vwapAfrrPos,
      vwapAfrrNeg,
      vwapMfrrPos,
      vwapMfrrNeg,
      sdAfrrPos: short ? sdAfrr : 0,
      sdAfrrNeg: short ? 0 : sdAfrr,
      sdMfrrPos: short ? sdMfrr : 0,
      sdMfrrNeg: short ? 0 : sdMfrr,
      voaaPos,
      voaaNeg,
      capacityReserveActivated: shape.capResQhs?.includes(qh) ?? false,
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Scenario 1 — windy spring day
// ---------------------------------------------------------------------------

const windyShape: DayShape = {
  seed: 20250412,
  dayAhead: (qh) => {
    const night = 34 - 14 * bump(qh, 12, 14);
    const middayCollapse = -118 * bump(qh, 52, 13);
    const eveningLift = 46 * bump(qh, 77, 8);
    return night + middayCollapse + eveningLift;
  },
  // Wind over-forecast in the afternoon leaves the system persistently long.
  balance: (qh, rnd) =>
    -420 * bump(qh, 50, 18) - 260 * bump(qh, 30, 12) + 300 * bump(qh, 78, 7) + (rnd() - 0.5) * 520,
  thinLiquidityQhs: [4, 5, 6, 7, 8, 9, 10, 11],
};

// ---------------------------------------------------------------------------
// Scenario 2 — Dunkelflaute
// ---------------------------------------------------------------------------

const dunkelflauteShape: DayShape = {
  seed: 20251128,
  dayAhead: (qh) => {
    const base = 168;
    const morning = 74 * bump(qh, 33, 7);
    const evening = 132 * bump(qh, 74, 6);
    const nightDip = -38 * bump(qh, 12, 12);
    return base + morning + evening + nightDip;
  },
  // Load under-forecast plus low renewables: the system leans short all day.
  balance: (qh, rnd) =>
    380 + 700 * bump(qh, 74, 8) + 380 * bump(qh, 33, 8) + (rnd() - 0.45) * 620,
};

// ---------------------------------------------------------------------------
// Scenario 3 — typical weekday
// ---------------------------------------------------------------------------

const weekdayShape: DayShape = {
  seed: 20250617,
  dayAhead: (qh) => {
    const base = 82;
    const morning = 44 * bump(qh, 32, 7);
    const solarDip = -58 * bump(qh, 52, 12);
    const evening = 76 * bump(qh, 75, 7);
    const night = -22 * bump(qh, 10, 12);
    return base + morning + solarDip + evening + night;
  },
  balance: (_qh, rnd) => (rnd() - 0.5) * 900,
};

// ---------------------------------------------------------------------------
// Scenario 4 — scarcity event
// ---------------------------------------------------------------------------

const scarcityShape: DayShape = {
  seed: 20260119,
  dayAhead: (qh) => {
    const base = 96;
    const morning = 52 * bump(qh, 32, 7);
    const solarDip = -40 * bump(qh, 52, 11);
    const evening = 640 * bump(qh, 76, 2.6);
    return base + morning + solarDip + evening;
  },
  // A large unplanned outage lands at 18:45 and is not cleared for over an hour.
  balance: (qh, rnd) => {
    const normal = (rnd() - 0.5) * 700;
    const event = 3050 * bump(qh, 76, 2.2);
    return normal + event;
  },
  capResQhs: [76],
};

// ---------------------------------------------------------------------------

/** Forecast errors revealed part-way through the day. Same for every scenario so
 *  the scenarios differ only in prices, which is what makes them comparable. */
const STANDARD_SURPRISES: Surprise[] = [
  {
    truck: "all",
    revealedAt: "intraday",
    returnShiftQh: 6,
    consumptionFactor: 1.15,
    label: "All ten trucks held up 90 minutes at the customer site, and the load was heavier than planned (+15 % energy)",
  },
  {
    truck: "all",
    revealedAt: "delivery",
    returnShiftQh: 3,
    consumptionFactor: 1.08,
    label: "A further 45-minute delay on the way home — only discovered as it happens, too late to trade",
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "windy",
    name: "Windy spring day",
    subtitle: "Deep negative midday prices, system long most of the day",
    teaches:
      "Being paid to charge. Why a negative reBAP means a LONG balance group pays and a SHORT one gets paid — the sign flip that surprises everyone the first time.",
    points: buildPoints(windyShape),
    dimensioned: DIMENSIONED_2023,
    surprises: STANDARD_SURPRISES,
    activationShare: { posAfrr: [0.04, 0.05, 0.03, 0.02, 0.06, 0.12], negAfrr: [0.14, 0.18, 0.31, 0.36, 0.12, 0.08] },
  },
  {
    id: "dunkelflaute",
    name: "Dunkelflaute",
    subtitle: "High flat prices, sharp evening peak, system short all day",
    teaches:
      "Scarcity. Upward flexibility is valuable and downward flexibility is nearly worthless. Module 1 dominates and imbalance is expensive in one direction only.",
    points: buildPoints(dunkelflauteShape),
    dimensioned: DIMENSIONED_2023,
    surprises: STANDARD_SURPRISES,
    activationShare: { posAfrr: [0.22, 0.26, 0.19, 0.21, 0.34, 0.41], negAfrr: [0.03, 0.02, 0.04, 0.05, 0.02, 0.01] },
  },
  {
    id: "weekday",
    name: "Typical weekday",
    subtitle: "Classic duck curve, system close to balanced much of the day",
    teaches:
      "The baseline. Module 2 does nearly all the work: the reBAP hugs the intraday index plus or minus ΔP, and imbalance is cheap but never free.",
    points: buildPoints(weekdayShape),
    dimensioned: DIMENSIONED_2023,
    surprises: STANDARD_SURPRISES,
    activationShare: { posAfrr: [0.09, 0.11, 0.08, 0.07, 0.14, 0.17], negAfrr: [0.08, 0.09, 0.13, 0.14, 0.06, 0.05] },
  },
  {
    id: "scarcity",
    name: "Scarcity event",
    subtitle: "Duck curve plus a large outage at 18:45 — Module 3 and KapResV fire",
    teaches:
      "What one bad quarter hour costs. The scarcity component crosses its 80 % dead band, and with the capacity reserve activated the price turns asymmetric — the only case where German short and long groups settle differently.",
    points: buildPoints(scarcityShape),
    dimensioned: DIMENSIONED_2023,
    surprises: STANDARD_SURPRISES,
    activationShare: { posAfrr: [0.10, 0.12, 0.09, 0.08, 0.18, 0.48], negAfrr: [0.07, 0.08, 0.11, 0.12, 0.05, 0.02] },
  },
];

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
