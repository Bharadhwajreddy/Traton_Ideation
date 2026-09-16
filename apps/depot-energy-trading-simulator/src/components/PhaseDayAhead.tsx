"use client";

import { useMemo } from "react";
import type { PlanMode } from "@/lib/depot";
import { eur, num, qhToTime } from "@/lib/format";
import type { BrpOffer, DepotConfig, Scenario, SimulationResult } from "@/lib/types";
import { HOURS_PER_QH } from "@/lib/types";
import { Legend, PowerChart, PriceChart } from "./charts";
import { Briefing, Card, Chip, Note, SegmentedControl, Slider, Stat } from "./ui";

const MODES: { value: PlanMode; label: string; hint: string }[] = [
  { value: "cheapest", label: "Cheapest hours", hint: "Fill the cheapest quarter hours in each truck's plugged-in window." },
  { value: "threshold", label: "Price threshold", hint: "Prefer quarter hours below your threshold, then cheapest." },
  { value: "flat", label: "Flat", hint: "Spread charging evenly. Lowest peak, no price optimisation." },
  { value: "asap", label: "As soon as plugged in", hint: "Charge immediately. The naive baseline." },
];

export function PhaseDayAhead({
  scenario,
  result,
  depot,
  brp,
  planMode,
  onPlanMode,
  priceThreshold,
  onPriceThreshold,
}: {
  scenario: Scenario;
  result: SimulationResult;
  depot: DepotConfig;
  brp: BrpOffer;
  planMode: PlanMode;
  onPlanMode: (m: PlanMode) => void;
  priceThreshold: number;
  onPriceThreshold: (v: number) => void;
}) {
  const priceData = useMemo(
    () =>
      result.perQh.map((q) => ({
        qh: q.qh,
        dayAhead: q.dayAhead,
        idIndex: q.idIndex,
        rebap: q.rebap.rebapShort,
        balanceGCC: q.rebap.balanceGCC,
        binding: q.rebap.binding,
      })),
    [result],
  );

  const daMw = result.perQh.map((q) => q.dayAheadMw);
  const powerData = result.perQh.map((q) => ({
    qh: q.qh,
    scheduled: q.dayAheadMw,
    actual: q.dayAheadMw,
    gridCap: depot.gridConnectionKw / 1000,
  }));

  const daLine = result.pnl.find((l) => l.key === "dayAhead")!;
  const vwap = result.totals.dayAheadMwh > 0 ? -daLine.value / result.totals.dayAheadMwh : 0;
  const flatBenchmark =
    scenario.points.reduce((a, p) => a + p.dayAhead, 0) / scenario.points.length;
  const saving = (flatBenchmark - vwap) * result.totals.dayAheadMwh;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <Briefing title="What is happening on this screen?" href="/explainer.html#buying">
          <p>
            It is the morning before delivery. You have to decide <strong>when your trucks will charge tomorrow</strong>,
            buy that energy, and have your BRP promise it to the grid operator.
          </p>
          <p className="mt-2">
            You do not know tomorrow&apos;s prices when you bid — nobody does. The day-ahead market is a{" "}
            <strong>blind auction</strong>: everyone submits how much they want at what maximum price, the exchange
            crosses all the curves at 12:00, and one clearing price comes out for each quarter hour. Everyone who
            clears pays that same price, whatever they bid.
          </p>
          <p className="mt-2">
            The simulator simplifies this: it lets you optimise against the day&apos;s <em>actual</em> prices, as
            though your forecast were perfect. Real life is the same decision with a worse crystal ball, so treat the
            saving shown here as an upper bound.
          </p>
          <p className="mt-2">
            Whatever you choose, your <strong>BRP</strong> places the order for you and then files the matching
            schedule with the TSO by <strong>14:30</strong>. That filing is what turns a trade into a promise.
          </p>
        </Briefing>
      </div>
      <Card
        title="Day-ahead auction — gate closure 12:00 on D-1"
        subtitle="One blind auction, 96 quarter-hour products since 1 October 2025, uniform clearing price. Everything you buy here becomes a schedule you must nominate to the TSO by 14:30."
        className="lg:col-span-12"
        right={
          <Legend
            items={[
              { color: "var(--series-1)", label: "Day-ahead" },
              { color: "var(--series-2)", label: "Intraday index", dashed: true },
              { color: "var(--series-3)", label: "reBAP (only known afterwards)" },
            ]}
          />
        }
      >
        <PriceChart data={priceData} />
        <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
          The reBAP line is shown for orientation. On D-1 you cannot see it — it is settled ex post.
        </p>
      </Card>

      <Card
        title="Your charging strategy"
        subtitle="This is the only real decision on D-1. It becomes your purchase and your Fahrplan."
        className="lg:col-span-5"
      >
        <SegmentedControl options={MODES} value={planMode} onChange={onPlanMode} />
        {planMode === "threshold" && (
          <div className="mt-3">
            <Slider
              label="Charge preferentially below"
              value={priceThreshold}
              min={-100}
              max={250}
              step={5}
              format={(v) => `${v} €/MWh`}
              onChange={onPriceThreshold}
            />
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Stat label="Volume bought" value={`${num(result.totals.dayAheadMwh)} MWh`} />
          <Stat label="Volume-weighted price" value={`${num(vwap)} €/MWh`} />
          <Stat
            label="Vs a flat profile"
            value={`${saving >= 0 ? "−" : "+"}${eur(Math.abs(saving))}`}
            detail={`day average ${num(flatBenchmark)} €/MWh`}
            tone={saving >= 0 ? "good" : "bad"}
          />
          <Stat
            label="Peak draw"
            value={`${num(Math.max(...daMw) * 1000, 0)} kW`}
            detail={`grid limit ${depot.gridConnectionKw} kW`}
            tone={Math.max(...daMw) * 1000 >= depot.gridConnectionKw - 1 ? "warn" : "neutral"}
          />
        </div>

        <div className="mt-4">
          <Note kind="legal" title="Nomination, Anlage 3 Ziffer 1.3">
            Your BRP must transmit the schedule to the TSO by <strong>14:30 on D-1</strong>, quarter-hourly,
            and the balance group must be nominated <strong>balanced</strong>. {brp.name} imposes its own
            earlier cut-off of <strong>{brp.nominationCutoff}</strong> — that is the deadline you actually live with.
          </Note>
        </div>
      </Card>

      <Card
        title="The resulting schedule"
        subtitle="Depot power per quarter hour. This is what the TSO will hold you to."
        className="lg:col-span-7"
      >
        <PowerChart data={powerData} gridCapMw={depot.gridConnectionKw / 1000} />
        <Legend items={[{ color: "var(--series-1)", label: "Nominated depot power (MW)" }]} />
      </Card>

      <Card title="Schedule detail" subtitle="The table view. Also the accessible fallback for the charts above." className="lg:col-span-12">
        <div className="max-h-[320px] overflow-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Quarter hour</th>
                <th>Day-ahead €/MWh</th>
                <th>Nominated MW</th>
                <th>Energy MWh</th>
                <th>Cost €</th>
                <th>Trucks plugged in</th>
              </tr>
            </thead>
            <tbody>
              {result.perQh
                .filter((q) => q.dayAheadMw > 0.001 || q.qh % 8 === 0)
                .map((q) => (
                  <tr key={q.qh}>
                    <td className="mono">
                      {qhToTime(q.qh)}–{qhToTime(q.qh + 1)}
                    </td>
                    <td className="tnum">{num(q.dayAhead)}</td>
                    <td className="tnum">{num(q.dayAheadMw, 3)}</td>
                    <td className="tnum">{num(q.dayAheadMw * HOURS_PER_QH, 3)}</td>
                    <td className="tnum">{num(q.dayAheadMw * HOURS_PER_QH * q.dayAhead)}</td>
                    <td className="tnum">{q.pluggedIn}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
          Showing quarter hours with charging, plus every second hour for context.{" "}
          <Chip>{result.perQh.filter((q) => q.dayAheadMw > 0.001).length} active quarter hours</Chip>
        </p>
      </Card>
    </div>
  );
}
