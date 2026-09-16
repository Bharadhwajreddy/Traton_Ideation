"use client";

import { Fragment, useMemo } from "react";
import { BRP_OFFERS } from "@/lib/constants";
import { eur, eurSigned, num } from "@/lib/format";
import { simulate, type SimulationInput } from "@/lib/simulate";
import type { BrpOffer, PnlLine, SimulationResult } from "@/lib/types";
import { PnlBars } from "./charts";
import { CashFlow } from "./CashFlow";
import { Briefing, Card, Chip, Note, Stat } from "./ui";

const GROUP_LABEL: Record<PnlLine["group"], string> = {
  energy: "Energy and imbalance",
  fees: "Market and BRP fees",
  network: "Network, levies and tax",
  flexibility: "Flexibility revenue",
  operations: "Operations",
};

export function PhaseSettlement({
  result,
  brp,
  input,
  onBrp,
}: {
  result: SimulationResult;
  brp: BrpOffer;
  input: SimulationInput;
  onBrp: (id: string) => void;
}) {
  // What would this exact day have cost under the other two contracts?
  const comparison = useMemo(
    () => BRP_OFFERS.map((b) => ({ offer: b, res: simulate({ ...input, brp: b }) })),
    [input],
  );
  const best = comparison.reduce((a, b) => (b.res.net > a.res.net ? b : a));

  const groups = (["energy", "fees", "network", "flexibility", "operations"] as const)
    .map((g) => ({
      group: g,
      lines: result.pnl.filter((l) => l.group === g),
      total: result.pnl.filter((l) => l.group === g).reduce((a, l) => a + l.value, 0),
    }))
    .filter((g) => g.lines.length > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <Briefing title="What is happening on this screen?" href="/explainer.html#depot">
          <p>The bill. Two things are worth more attention than the headline number.</p>
          <p className="mt-2">
            <strong>Compare the subtotals, not the lines.</strong> On a typical run the network charges and levies
            exceed the entire energy bill, and the imbalance line — the thing everyone worries about — is among the
            smallest numbers on the page. That proportion is the lesson.
          </p>
          <p className="mt-2">
            <strong>Then read the three-contract table.</strong> Same day, same fleet, same trading, priced under all
            three BRP archetypes. Which one wins depends entirely on how volatile the imbalance price was
            <em> that day</em> — change the scenario and the winner changes. There is no best contract, only a best
            contract for a given appetite for risk.
          </p>
        </Briefing>
      </div>
      <Card
        title="The day's settlement"
        subtitle="Everything that moves money, on one page. Negative is a cost; positive is a receipt."
        className="lg:col-span-12"
      >
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Net result" value={eur(result.net)} tone={result.net >= 0 ? "good" : "bad"} />
          <Stat
            label="Effective cost"
            value={`${num(result.totals.effectiveEurPerMwh)} €/MWh`}
            detail="all-in, per MWh delivered"
          />
          <Stat label="Energy delivered" value={`${num(result.totals.deliveredMwh)} MWh`} />
          <Stat
            label="Gross deviation"
            value={`${num(result.totals.imbalanceRatePct, 1)} %`}
            detail={`${num(result.totals.absImbalanceMwh, 3)} MWh`}
            tone={result.totals.imbalanceRatePct > 10 ? "warn" : "neutral"}
          />
          <Stat label="Peak power" value={`${num(result.totals.peakKw, 0)} kW`} />
          <Stat
            label="Cost per truck"
            value={eur(result.net / 10)}
            detail="per truck, per day"
            tone={result.net >= 0 ? "good" : "bad"}
          />
        </div>
      </Card>

      <CashFlow result={result} brp={brp} fees={input.fees} />

      <Card title="Where the money went" className="lg:col-span-7">
        <PnlBars lines={result.pnl.map((l) => ({ label: l.label, value: l.value, detail: l.detail }))} />
      </Card>

      <Card title="Line by line" subtitle="The table view — every number in the chart, with its basis." className="lg:col-span-5">
        <div className="scroll-x">
        <table className="data">
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.group}>
                <tr>
                  <td
                    colSpan={2}
                    className="pt-3 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-muted)", borderBottom: "none" }}
                  >
                    {GROUP_LABEL[g.group]}
                  </td>
                </tr>
                {g.lines.map((l) => (
                  <tr key={l.key}>
                    <td className="wrap">
                      <span className="block">{l.label}</span>
                      <span className="block text-[10.5px]" style={{ color: "var(--text-muted)" }}>
                        {l.detail}
                      </span>
                    </td>
                    <td
                      className="tnum align-top font-semibold"
                      style={{ color: l.value >= 0 ? "var(--good)" : "var(--text-primary)" }}
                    >
                      {eurSigned(l.value, 2)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ color: "var(--text-secondary)" }}>Subtotal</td>
                  <td className="tnum font-bold">{eurSigned(g.total, 2)}</td>
                </tr>
              </Fragment>
            ))}
            <tr>
              <td className="pt-3 text-[14px] font-bold">Net</td>
              <td
                className="tnum pt-3 text-[15px] font-bold"
                style={{ color: result.net >= 0 ? "var(--good)" : "var(--critical)" }}
              >
                {eurSigned(result.net, 2)}
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </Card>

      <Card
        title="The same day under all three BRP contracts"
        subtitle="Identical fleet, identical trading, identical weather. The only thing that changes is who carries the imbalance."
        className="lg:col-span-12"
      >
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Model</th>
                <th>Imbalance settled</th>
                <th>BRP fees</th>
                <th>Premium</th>
                <th>Net</th>
                <th>€/MWh</th>
                <th>Difference</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(({ offer, res }) => {
                const imb = res.pnl.find((l) => l.key === "imbalance")?.value ?? 0;
                const fees =
                  (res.pnl.find((l) => l.key === "brpFixed")?.value ?? 0) +
                  (res.pnl.find((l) => l.key === "brpEnergy")?.value ?? 0);
                const premium = res.pnl.find((l) => l.key === "brpPremium")?.value ?? 0;
                const active = offer.id === brp.id;
                return (
                  <tr key={offer.id} style={{ background: active ? "var(--accent-soft)" : undefined }}>
                    <td className="font-semibold">
                      {offer.name} {active && <Chip tone="info">yours</Chip>}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {offer.model === "passThrough" ? "A — pass-through" : offer.model === "pooled" ? "B — pooled" : "C — full-service"}
                    </td>
                    <td className="tnum" style={{ color: imb >= 0 ? "var(--good)" : "var(--critical)" }}>
                      {eurSigned(imb, 2)}
                    </td>
                    <td className="tnum">{eurSigned(fees, 2)}</td>
                    <td className="tnum">{premium ? eurSigned(premium, 2) : "—"}</td>
                    <td className="tnum font-bold">{eur(res.net)}</td>
                    <td className="tnum">{num(res.totals.effectiveEurPerMwh)}</td>
                    <td className="tnum" style={{ color: res.net >= best.res.net ? "var(--good)" : "var(--critical)" }}>
                      {res.net >= best.res.net ? "best" : eurSigned(res.net - best.res.net)}
                    </td>
                    <td>
                      {!active && (
                        <button
                          type="button"
                          onClick={() => onBrp(offer.id)}
                          className="rounded-md px-2 py-1 text-[11.5px] font-semibold"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                        >
                          switch
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <Note kind="info" title="Read the comparison, not the headline fee">
            Pass-through has the cheapest fee and the fattest tail. Whether it wins depends entirely on how
            volatile the reBAP was on this particular day — switch scenarios and run it again.
          </Note>
          <Note kind="legal" title="The credit haircut">
            GreenTrade passes through only {Math.round((BRP_OFFERS[2].creditPassThrough ?? 1) * 100)} % of the
            money the reBAP owes you. That is a private two-price scheme inside a single-price regulatory
            regime — perfectly legal, extremely common, and invisible unless you look for it.
          </Note>
          <Note kind="warn" title="What this does not model">
            Redispatch 2.0 exposure, § 14a EnWG grid-charge modules, VAT and electricity-tax mechanics, real
            prequalification availability, calendar ageing, and multi-day effects. See{" "}
            <span className="mono">energy-markets/docs/06</span> for the full list.
          </Note>
        </div>
      </Card>
    </div>
  );
}
