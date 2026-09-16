"use client";

import { eur, num, qhToTime } from "@/lib/format";
import { INTRADAY_REVEAL_QH } from "@/lib/simulate";
import type { BrpOffer, FeeConfig, Scenario, SimulationResult } from "@/lib/types";
import { HOURS_PER_QH } from "@/lib/types";
import { Legend, PowerChart } from "./charts";
import { Briefing, Card, Chip, Note, Slider, Stat } from "./ui";

export function PhaseIntraday({
  scenario,
  result,
  brp,
  fees,
  closeFraction,
  onCloseFraction,
  gridCapMw,
}: {
  scenario: Scenario;
  result: SimulationResult;
  brp: BrpOffer;
  fees: FeeConfig;
  closeFraction: number;
  onCloseFraction: (v: number) => void;
  gridCapMw: number;
}) {
  const intradayLine = result.pnl.find((l) => l.key === "intraday")!;
  const grossMwh = result.perQh.reduce((a, q) => a + Math.abs(q.intradayMw) * HOURS_PER_QH, 0);
  const netMwh = result.totals.intradayMwh;
  const spreadCost = grossMwh * fees.intradayHalfSpreadEurPerMwh;

  const powerData = result.perQh.map((q) => ({
    qh: q.qh,
    scheduled: q.dayAheadMw,
    actual: q.scheduledMw,
    gridCap: gridCapMw,
  }));

  const revealed = scenario.surprises.filter((s) => s.revealedAt === "intraday");
  const hidden = scenario.surprises.filter((s) => s.revealedAt === "delivery");

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <Briefing title="What is happening on this screen?" href="/explainer.html#buying">
          <p>
            Yesterday you promised the grid operator a charging schedule. Today reality is drifting away from it.
          </p>
          <p className="mt-2">
            The <strong>intraday market</strong> is where you fix that. It is not another auction — it is a live order
            book, like a share market, open until <strong>5 minutes before</strong> each quarter hour inside Germany.
            Because it is an order book there is a <strong>bid–ask spread</strong>: you buy a little above the mid
            price and sell a little below it, so changing your mind is never free.
          </p>
          <p className="mt-2">
            <strong>The one decision here:</strong> close the gap now at a known cost, or carry it into delivery and
            settle it at the imbalance price — which you will not know until weeks later. That is the entire trade-off,
            and there is no universally right answer. Slide it to 0 % and to 100 % on a calm day and then on the
            scarcity day, and watch the settlement screen.
          </p>
        </Briefing>
      </div>
      <Card
        title={`11:00 on delivery day — the forecast just changed`}
        subtitle="Continuous intraday runs until 5 minutes before delivery inside the German bidding zone. You can still fix your position — for a price."
        className="lg:col-span-12"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-2 text-[12px] font-semibold" style={{ color: "var(--serious)" }}>
              Known now
            </div>
            <ul className="space-y-2">
              {revealed.map((s, i) => (
                <li
                  key={i}
                  className="rounded-lg px-3 py-2 text-[12.5px]"
                  style={{ background: "var(--surface-2)", borderLeft: "3px solid var(--serious)" }}
                >
                  {s.label}
                  <span className="mono ml-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {s.returnShiftQh >= 0 ? "+" : ""}
                    {s.returnShiftQh * 15} min · ×{s.consumptionFactor} energy
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>
              Still hidden — you will only learn this at delivery
            </div>
            <ul className="space-y-2">
              {hidden.map((s, i) => (
                <li
                  key={i}
                  className="rounded-lg px-3 py-2 text-[12.5px]"
                  style={{ background: "var(--surface-2)", borderLeft: "3px dashed var(--border-strong)", color: "var(--text-muted)" }}
                >
                  Something will change on one truck. This is the part you cannot trade against — and it is
                  exactly the residual the imbalance price is designed to price.
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card
        title="How much of the gap do you close?"
        subtitle="Trading flat costs you the spread and the fees. Leaving it open exposes you to the reBAP. That trade-off IS the intraday market."
        className="lg:col-span-5"
      >
        {!brp.intradayAccess ? (
          <Note kind="warn" title={`${brp.name} offers day-ahead access only`}>
            You cannot re-trade. Everything the forecast got wrong will land in imbalance settlement.
            This is what the cheap headline fee actually buys you.
          </Note>
        ) : (
          <>
            <Slider
              label="Close this share of the revealed gap"
              value={Math.round(closeFraction * 100)}
              min={0}
              max={100}
              step={5}
              format={(v) => `${v} %`}
              hint="0 % = do nothing and carry the position into delivery. 100 % = fully re-nominate."
              onChange={(v) => onCloseFraction(v / 100)}
            />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Stat
                label="Net traded"
                value={`${netMwh >= 0 ? "+" : "−"}${num(Math.abs(netMwh), 3)} MWh`}
                detail={netMwh >= 0 ? "bought" : "sold"}
              />
              <Stat label="Gross volume" value={`${num(grossMwh, 3)} MWh`} detail="crosses the spread" />
              <Stat
                label="Cost of the adjustment"
                value={eur(-intradayLine.value)}
                tone={intradayLine.value < 0 ? "bad" : "good"}
              />
              <Stat
                label="…of which spread"
                value={eur(spreadCost)}
                detail={`${fees.intradayHalfSpreadEurPerMwh} €/MWh half-spread`}
                tone="warn"
              />
            </div>
          </>
        )}

        <div className="mt-4 space-y-3">
          <Note kind="info" title="Gate closures you are trading against">
            Cross-border intraday closes 60 minutes before delivery. <strong>Inside Germany you can trade
            until 5 minutes before delivery.</strong> Your intraday schedule change to the TSO needs at least
            one quarter hour of lead time (Anlage 3, Ziffer 1.4), and the balance group must be nominated
            balanced by then.
          </Note>
          <Note kind="warn" title="Liquidity is not free">
            Quarter hours within two hours of the {qhToTime(INTRADAY_REVEAL_QH)} reveal cross a spread
            widened by <strong>×{fees.lateSpreadMultiplier}</strong>. You find out late and you pay for
            finding out late — which is the real argument for better forecasting, not for a different tariff.
          </Note>
        </div>
      </Card>

      <Card
        title="Position before and after"
        subtitle="Blue is what you bought day-ahead. Orange is what you are now nominating."
        className="lg:col-span-7"
        right={
          <Legend
            items={[
              { color: "var(--series-1)", label: "Day-ahead position" },
              { color: "var(--series-2)", label: "Nominated after intraday" },
            ]}
          />
        }
      >
        <PowerChart data={powerData} gridCapMw={gridCapMw} />
        <div className="mt-3 max-h-[190px] overflow-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Quarter hour</th>
                <th>Day-ahead MW</th>
                <th>Intraday MW</th>
                <th>Nominated MW</th>
                <th>ID index €/MWh</th>
              </tr>
            </thead>
            <tbody>
              {result.perQh
                .filter((q) => Math.abs(q.intradayMw) > 0.001)
                .map((q) => (
                  <tr key={q.qh}>
                    <td className="mono">
                      {qhToTime(q.qh)}–{qhToTime(q.qh + 1)}
                    </td>
                    <td className="tnum">{num(q.dayAheadMw, 3)}</td>
                    <td className="tnum" style={{ color: q.intradayMw >= 0 ? "var(--series-1)" : "var(--critical)" }}>
                      {q.intradayMw >= 0 ? "+" : "−"}
                      {num(Math.abs(q.intradayMw), 3)}
                    </td>
                    <td className="tnum">{num(q.scheduledMw, 3)}</td>
                    <td className="tnum">{num(q.idIndex)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {grossMwh < 0.0005 && (
          <p className="mt-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
            <Chip>no intraday trades</Chip> The whole revealed gap is being carried into delivery.
          </p>
        )}
      </Card>
    </div>
  );
}
