"use client";

import { eur, num } from "@/lib/format";
import type { BrpOffer, FeeConfig, SimulationResult } from "@/lib/types";
import { Card, Note } from "./ui";

/**
 * 2026 German levies and electricity tax, in €/MWh. These are set by the state, not by
 * the network operator, so the combined "grid fees, levies and tax" figure is split here
 * to show the reader which part of it goes where.
 *   KWKG 0.446 + Offshore 0.941 + § 19 StromNEV 1.559 ct/kWh = 2.946 ct/kWh = 29.46 €/MWh
 *   Stromsteuer 2.050 ct/kWh = 20.50 €/MWh
 */
export const STATE_LEVIES_EUR_PER_MWH = 29.46;
export const ELECTRICITY_TAX_EUR_PER_MWH = 20.5;
const STATE_TOTAL = STATE_LEVIES_EUR_PER_MWH + ELECTRICITY_TAX_EUR_PER_MWH;

const ACTOR = {
  you: "var(--series-2)",
  brp: "var(--series-1)",
  market: "var(--series-3)",
  state: "var(--serious)",
} as const;

export function CashFlow({
  result,
  brp,
  fees,
}: {
  result: SimulationResult;
  brp: BrpOffer;
  fees: FeeConfig;
}) {
  const line = (k: string) => result.pnl.find((l) => l.key === k)?.value ?? 0;
  const mwh = result.totals.deliveredMwh;

  const energy = -(line("dayAhead") + line("intraday"));
  const imbalance = line("imbalance"); // signed: positive means money comes back to you
  const marketFees = -line("exchange");
  const brpFees = -(line("brpFixed") + line("brpEnergy") + line("brpPremium"));

  // Split the single "grid fees, levies and tax" figure into its real recipients.
  const toState = Math.min(fees.gridAndLeviesEurPerMwh, STATE_TOTAL) * mwh;
  const gridEnergyPart = Math.max(0, fees.gridAndLeviesEurPerMwh - STATE_TOTAL) * mwh;
  const toGrid = gridEnergyPart + -line("peak");
  const degradation = -line("degradation");
  const failures = -line("failures");

  const rows = [
    {
      who: "Your BRP",
      color: ACTOR.brp,
      what: `Balance-group service: ${brp.name}. Fixed fee plus a charge per MWh${brp.insurancePremiumEurPerMwh ? ", plus the premium for absorbing your imbalance" : ""}.`,
      amount: brpFees,
      kind: "A fee. This is what the BRP keeps for itself.",
    },
    {
      who: "The power exchange, through your BRP",
      color: ACTOR.market,
      what: "The electricity itself, bought day-ahead and adjusted intraday. Your BRP places the order and passes the cost on.",
      amount: energy,
      kind: "A price, not a fee. You are buying a thing.",
    },
    {
      who: "The exchange and the clearing house",
      color: ACTOR.market,
      what: `Trading fee (${fees.exchangeFeeDayAheadEurPerMwh} €/MWh day-ahead, ${fees.exchangeFeeIntradayEurPerMwh} €/MWh intraday) and the clearing fee (${fees.clearingFeeEurPerMwh} €/MWh) for guaranteeing both sides of each trade.`,
      amount: marketFees,
      kind: "A fee, charged per MWh traded. Small, but real.",
    },
    {
      who: "The TSO, through your BRP",
      color: ACTOR.brp,
      what: "Imbalance settlement — the difference between what your balance group promised and what it did, priced at the reBAP.",
      amount: imbalance,
      kind: imbalance >= 0 ? "A price. This quarter it went YOUR way and money came back." : "A price, not a penalty. It can go either way.",
      signed: true,
    },
    {
      who: "Your grid operator",
      color: ACTOR.state,
      what: "Network charges: a part per kWh withdrawn, plus the Leistungspreis on your highest 15-minute peak.",
      amount: toGrid,
      kind: "A regulated tariff. Not negotiable, but the peak part IS reducible.",
    },
    {
      who: "The German state",
      color: ACTOR.state,
      what: `Electricity tax (${ELECTRICITY_TAX_EUR_PER_MWH} €/MWh) and the KWKG, Offshore and § 19 StromNEV levies (${STATE_LEVIES_EUR_PER_MWH} €/MWh).`,
      amount: toState,
      kind: "Tax. Nothing you can do about it.",
    },
    {
      who: "Nobody — it is your own asset",
      color: "var(--text-muted)",
      what: "Battery wear from the charging and discharging you did today. No cash leaves your account; the value simply leaves your trucks.",
      amount: degradation,
      kind: "A real cost that never appears on any invoice.",
    },
  ].filter((r) => Math.abs(r.amount) > 0.005);

  if (failures > 0) {
    rows.push({
      who: "Your customer",
      color: "var(--critical)",
      what: "A truck could not leave with enough charge. Someone did not get their delivery.",
      amount: failures,
      kind: "Not an energy cost at all — and bigger than all of them.",
    });
  }

  return (
    <Card
      title="Where your money actually goes"
      subtitle="Every euro that left (or arrived) today, and which counterparty it went to. Follow the arrows outward from you."
      className="lg:col-span-12"
    >
      <div className="scroll-x">
        <svg viewBox="0 0 960 360" role="img" aria-label="Cash flow from the depot owner to the BRP, the exchange, the clearing house, the TSO, the grid operator and the state" style={{ minWidth: 700 }}>
          {/* YOU */}
          <rect x="16" y="140" width="176" height="76" rx="12" fill="var(--panel, var(--surface-1))" stroke={ACTOR.you} strokeWidth="2.5" />
          <text x="104" y="168" textAnchor="middle" fontSize="14" fontWeight="700" fill={ACTOR.you}>YOU</text>
          <text x="104" y="187" textAnchor="middle" fontSize="11" fill="var(--text-secondary)">the depot owner</text>
          <text x="104" y="205" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--text-primary)">{eur(result.net)} today</text>

          {/* YOUR BRP */}
          <rect x="300" y="118" width="188" height="72" rx="11" fill="var(--surface-1)" stroke={ACTOR.brp} strokeWidth="2.5" />
          <text x="394" y="144" textAnchor="middle" fontSize="13" fontWeight="700" fill={ACTOR.brp}>YOUR BRP</text>
          <text x="394" y="161" textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">{brp.name}</text>
          <text x="394" y="177" textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">all energy money flows here</text>

          <path d="M192 166 L 296 154" stroke={ACTOR.brp} strokeWidth="2" markerEnd="url(#cfArrow)" />
          <text x="200" y="146" fontSize="10.5" fill={ACTOR.brp}>energy &amp; fees</text>

          {/* behind the BRP */}
          <rect x="596" y="26" width="200" height="56" rx="10" fill="var(--surface-1)" stroke={ACTOR.market} strokeWidth="1.8" />
          <text x="696" y="48" textAnchor="middle" fontSize="12" fontWeight="700" fill={ACTOR.market}>Power exchange</text>
          <text x="696" y="65" textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">sells you the electricity</text>

          <rect x="596" y="98" width="200" height="56" rx="10" fill="var(--surface-1)" stroke={ACTOR.market} strokeWidth="1.8" />
          <text x="696" y="120" textAnchor="middle" fontSize="12" fontWeight="700" fill={ACTOR.market}>Clearing house</text>
          <text x="696" y="137" textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">guarantees every trade</text>

          <rect x="596" y="170" width="200" height="56" rx="10" fill="var(--surface-1)" stroke={ACTOR.brp} strokeWidth="1.8" />
          <text x="696" y="192" textAnchor="middle" fontSize="12" fontWeight="700" fill={ACTOR.brp}>TSO</text>
          <text x="696" y="209" textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">settles your imbalance</text>

          <path d="M488 140 L 592 56"  stroke={ACTOR.market} strokeWidth="1.8" markerEnd="url(#cfArrowG)" />
          <path d="M488 152 L 592 126" stroke={ACTOR.market} strokeWidth="1.8" markerEnd="url(#cfArrowG)" />
          <path d="M488 166 L 592 196" stroke={ACTOR.brp} strokeWidth="1.8" markerEnd="url(#cfArrow)" />
          <path d="M592 206 L 492 178" stroke={ACTOR.brp} strokeWidth="1.8" strokeDasharray="4 3" markerEnd="url(#cfArrow)" />
          <text x="496" y="250" fontSize="10" fill={ACTOR.brp}>imbalance flows both ways</text>

          {/* direct from you */}
          <rect x="300" y="236" width="188" height="52" rx="10" fill="var(--surface-1)" stroke={ACTOR.state} strokeWidth="1.8" />
          <text x="394" y="257" textAnchor="middle" fontSize="12" fontWeight="700" fill={ACTOR.state}>Grid operator</text>
          <text x="394" y="274" textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">network charges + peak charge</text>

          <rect x="300" y="300" width="188" height="48" rx="10" fill="var(--surface-1)" stroke={ACTOR.state} strokeWidth="1.8" />
          <text x="394" y="320" textAnchor="middle" fontSize="12" fontWeight="700" fill={ACTOR.state}>The German state</text>
          <text x="394" y="337" textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">electricity tax + levies</text>

          <path d="M120 218 L 120 262 L 296 262" fill="none" stroke={ACTOR.state} strokeWidth="2" markerEnd="url(#cfArrowS)" />
          <path d="M96 218 L 96 324 L 296 324"  fill="none" stroke={ACTOR.state} strokeWidth="2" markerEnd="url(#cfArrowS)" />

          {/* aggregator: absent here */}
          <rect x="596" y="256" width="200" height="72" rx="10" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="5 4" />
          <text x="696" y="278" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-muted)">Aggregator</text>
          <text x="696" y="295" textAnchor="middle" fontSize="10" fill="var(--text-muted)">not involved in this simulation</text>
          <text x="696" y="311" textAnchor="middle" fontSize="10" fill="var(--text-muted)">— only appears if you sell</text>
          <text x="696" y="324" textAnchor="middle" fontSize="10" fill="var(--text-muted)">balancing services</text>

          <defs>
            <marker id="cfArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill={ACTOR.brp} /></marker>
            <marker id="cfArrowG" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill={ACTOR.market} /></marker>
            <marker id="cfArrowS" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill={ACTOR.state} /></marker>
          </defs>
        </svg>
      </div>

      <div className="scroll-x mt-4">
        <table className="data">
          <thead>
            <tr>
              <th>Who gets it</th>
              <th className="wrap">What for</th>
              <th>Today</th>
              <th className="wrap">Fee, price or tax?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.who}>
                <td className="wrap">
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: r.color }} />
                  <strong>{r.who}</strong>
                </td>
                <td className="wrap" style={{ color: "var(--text-secondary)" }}>
                  {r.what}
                </td>
                <td
                  className="tnum font-semibold"
                  style={{ color: r.signed && r.amount >= 0 ? "var(--good)" : "var(--text-primary)" }}
                >
                  {r.signed && r.amount >= 0 ? "+" : ""}
                  {eur(Math.abs(r.amount), 2)}
                </td>
                <td className="wrap" style={{ color: "var(--text-secondary)" }}>
                  {r.kind}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Note kind="info" title="A fee is not the same as a price">
          You <strong>buy</strong> electricity, and you <strong>buy</strong> or <strong>sell</strong> imbalance — those
          are prices, and a price can go either way. An <strong>exchange fee</strong> is what the marketplace charges
          for running the market, and a <strong>clearing fee</strong> is what the clearing house charges for standing
          between buyer and seller so that neither has to trust the other. Fees only ever go one way: out.
        </Note>
        <Note kind="legal" title="Is the aggregator the same as the BRP?">
          <strong>Sometimes, but they are different jobs.</strong> The <strong>BRP</strong> handles your balance group
          and your energy — you always have one. An <strong>aggregator</strong> only appears if you sell flexibility
          into the balancing market, which is out of scope here, so no aggregator appears above. In Germany the two
          are very often the same company, because an aggregator needs your BRP&apos;s written consent anyway — which
          is much easier to obtain when it is its own.
        </Note>
      </div>

      <p className="mt-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
        Energy delivered today: {num(mwh)} MWh. Every figure above is this one day, so the BRP&apos;s monthly fee is
        shown pro-rated and the yearly peak charge is shown as one day&apos;s share of it.
      </p>
    </Card>
  );
}
