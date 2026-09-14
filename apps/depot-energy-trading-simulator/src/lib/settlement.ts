/**
 * Imbalance allocation under a BRP contract, and the day's P&L.
 *
 * The regulated part (reBAP) is identical for everyone — see rebap.ts. What
 * differs between BRP offers is how much of that regulated price reaches YOU.
 * That contractual layer is what this file models, and it is where most of the
 * money actually moves for a small portfolio.
 */

import type { BrpOffer, PnlLine, RebapBreakdown } from "./types";

export interface ImbalanceAllocation {
  /** MWh of deviation that you are actually exposed to after the contract. */
  exposedMwh: number;
  /** €, positive = you receive. */
  eur: number;
  /** Which contract mechanism produced this. */
  note: string;
}

/**
 * Allocate one quarter hour's raw deviation under one BRP contract.
 *
 * `rawMwh` uses the depot convention: positive = drew MORE than nominated, so the
 * balance group is SHORT.
 */
export function allocateImbalance(
  rawMwh: number,
  scheduledMwh: number,
  r: RebapBreakdown,
  brp: BrpOffer,
): ImbalanceAllocation {
  if (rawMwh === 0) return { exposedMwh: 0, eur: 0, note: "flat" };

  const price = rawMwh > 0 ? r.rebapShort : r.rebapLong;
  const band = brp.toleranceBand * Math.abs(scheduledMwh);
  const sign = Math.sign(rawMwh);

  if (brp.model === "passThrough") {
    let eur = -rawMwh * price;
    if (eur > 0) eur *= brp.creditPassThrough;
    return {
      exposedMwh: rawMwh,
      eur,
      note: `100 % pass-through at ${price.toFixed(2)} €/MWh`,
    };
  }

  if (brp.model === "pooled") {
    const netted = rawMwh * brp.poolNettingFactor;
    const inBandMwh = sign * Math.min(Math.abs(netted), band);
    const outMwh = netted - inBandMwh;
    let eur = -(inBandMwh * price);
    const outEur = -(outMwh * price);
    // The out-of-band multiplier penalises charges; it never inflates credits.
    eur += outEur < 0 ? outEur * brp.outOfBandMultiplier : outEur;
    if (eur > 0) eur *= brp.creditPassThrough;
    return {
      exposedMwh: netted,
      eur,
      note:
        Math.abs(outMwh) > 1e-9
          ? `netted ×${brp.poolNettingFactor}, ${Math.abs(outMwh).toFixed(3)} MWh outside band ×${brp.outOfBandMultiplier}`
          : `netted ×${brp.poolNettingFactor}, inside tolerance band`,
    };
  }

  // fullService: the BRP absorbs reBAP exposure entirely. You pay a premium
  // (charged separately, on volume) and a flat penalty outside the band.
  const excess = sign * Math.max(0, Math.abs(rawMwh) - band);
  if (Math.abs(excess) < 1e-9) {
    return { exposedMwh: 0, eur: 0, note: "absorbed by the BRP (inside band)" };
  }
  return {
    exposedMwh: 0,
    eur: -Math.abs(excess) * brp.outOfBandFlatEurPerMwh,
    note: `${Math.abs(excess).toFixed(3)} MWh outside band at ${brp.outOfBandFlatEurPerMwh} €/MWh flat`,
  };
}

export function pnlGroupTotal(lines: PnlLine[], group: PnlLine["group"]): number {
  return lines.filter((l) => l.group === group).reduce((a, l) => a + l.value, 0);
}
