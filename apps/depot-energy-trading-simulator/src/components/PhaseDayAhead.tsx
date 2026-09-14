"use client";

import { useMemo } from "react";
import { BLOCK_LABELS } from "@/lib/constants";
import type { PlanMode } from "@/lib/depot";
import { eur, num, qhToTime } from "@/lib/format";
import { availableCapacityByBlock } from "@/lib/simulate";
import type { BalancingConfig, BalancingOffer, BrpOffer, DepotConfig, Scenario, SimulationResult } from "@/lib/types";
import { HOURS_PER_QH } from "@/lib/types";
import { Legend, PowerChart, PriceChart } from "./charts";
import { Card, Chip, Note, NumberField, SegmentedControl, Slider, Stat } from "./ui";

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
  balancing,
  balancingOffer,
  onBalancingOffer,
  onBalancing,
}: {
  scenario: Scenario;
  result: SimulationResult;
  depot: DepotConfig;
  brp: BrpOffer;
  planMode: PlanMode;
  onPlanMode: (m: PlanMode) => void;
  priceThreshold: number;
  onPriceThreshold: (v: number) => void;
  balancing: BalancingConfig;
  balancingOffer: BalancingOffer;
  onBalancingOffer: (o: BalancingOffer) => void;
  onBalancing: (b: BalancingConfig) => void;
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

  const available = useMemo(
    () => availableCapacityByBlock(scenario, depot, daMw),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario, depot, planMode, priceThreshold],
  );

  const daLine = result.pnl.find((l) => l.key === "dayAhead")!;
  const vwap = result.totals.dayAheadMwh > 0 ? -daLine.value / result.totals.dayAheadMwh : 0;
  const flatBenchmark =
    scenario.points.reduce((a, p) => a + p.dayAhead, 0) / scenario.points.length;
  const saving = (flatBenchmark - vwap) * result.totals.dayAheadMwh;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
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

      <Card
        title="Optional — offer balancing capacity"
        subtitle="Six 4-hour blocks, auctioned D-1 at 09:00 for aFRR. Minimum bid 1 MW. Only available if your BRP gives you pool access."
        className="lg:col-span-12"
      >
        {!brp.balancingAccess ? (
          <Note kind="warn" title={`${brp.name} offers no balancing market access`}>
            To bid into aFRR you must be a prequalified BSP or sit inside someone else&apos;s prequalified pool.
            Switch to FlexPool Partner or GreenTrade Full-Service in Setup to unlock this.
          </Note>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>4-hour block</th>
                    {BLOCK_LABELS.map((b) => (
                      <th key={b}>{b}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: "var(--text-secondary)" }}>
                      Negative aFRR offered (MW)
                      <span className="ml-1 text-[10.5px]" style={{ color: "var(--text-muted)" }}>
                        charge harder on command
                      </span>
                    </td>
                    {balancingOffer.aFrrNeg.map((v, i) => (
                      <td key={i}>
                        <input
                          type="number"
                          className="w-[74px] text-right"
                          min={0}
                          step={0.1}
                          value={v}
                          onChange={(e) => {
                            const next = [...balancingOffer.aFrrNeg];
                            next[i] = Math.max(0, Number(e.target.value));
                            onBalancingOffer({ ...balancingOffer, aFrrNeg: next });
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-muted)" }}>Fleet can actually hold (MW)</td>
                    {available.negMw.map((v, i) => (
                      <td
                        key={i}
                        className="tnum"
                        style={{ color: balancingOffer.aFrrNeg[i] > v ? "var(--critical)" : "var(--good)" }}
                      >
                        {num(v, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-secondary)" }}>
                      Positive aFRR offered (MW)
                      <span className="ml-1 text-[10.5px]" style={{ color: "var(--text-muted)" }}>
                        back off or discharge
                      </span>
                    </td>
                    {balancingOffer.aFrrPos.map((v, i) => (
                      <td key={i}>
                        <input
                          type="number"
                          className="w-[74px] text-right"
                          min={0}
                          step={0.1}
                          value={v}
                          onChange={(e) => {
                            const next = [...balancingOffer.aFrrPos];
                            next[i] = Math.max(0, Number(e.target.value));
                            onBalancingOffer({ ...balancingOffer, aFrrPos: next });
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-muted)" }}>Fleet can actually hold (MW)</td>
                    {available.posMw.map((v, i) => (
                      <td
                        key={i}
                        className="tnum"
                        style={{ color: balancingOffer.aFrrPos[i] > v ? "var(--critical)" : "var(--good)" }}
                      >
                        {num(v, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-muted)" }}>Activated share this day</td>
                    {scenario.activationShare.negAfrr.map((v, i) => (
                      <td key={i} className="tnum" style={{ color: "var(--text-muted)" }}>
                        aFRR− {Math.round(v * 100)} % · aFRR+ {Math.round(scenario.activationShare.posAfrr[i] * 100)} %
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                label="aFRR− capacity price"
                value={balancing.aFrrCapacityNegEurPerMwH}
                step={1}
                suffix="€/MW·h"
                onChange={(v) => onBalancing({ ...balancing, aFrrCapacityNegEurPerMwH: v })}
              />
              <NumberField
                label="aFRR+ capacity price"
                value={balancing.aFrrCapacityPosEurPerMwH}
                step={1}
                suffix="€/MW·h"
                onChange={(v) => onBalancing({ ...balancing, aFrrCapacityPosEurPerMwH: v })}
              />
              <Slider
                label="Aggregator revenue share"
                value={Math.round(balancing.aggregatorSharePct * 100)}
                min={0}
                max={60}
                step={5}
                format={(v) => `${v} %`}
                onChange={(v) => onBalancing({ ...balancing, aggregatorSharePct: v / 100 })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Capacity revenue"
                  value={eur(result.totals.balancingCapacityRevenue)}
                  tone={result.totals.balancingCapacityRevenue > 0 ? "good" : "neutral"}
                />
                <Stat
                  label="Activation"
                  value={eur(result.totals.balancingActivationRevenue)}
                  tone={result.totals.balancingActivationRevenue >= 0 ? "good" : "bad"}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <Note kind="legal" title="The minimum bid is 1 MW of RELIABLE capacity">
                What counts is what a TSO service run demonstrates you can hold for the whole 4-hour block —
                not nameplate charger power. A depot whose trucks are all out from 06:00 to 16:00 has
                essentially zero prequalified capacity in those blocks. The red figures above are offers your
                fleet cannot actually honour.
              </Note>
              <Note kind="info" title="Prequalify for the NEGATIVE direction first">
                Negative balancing energy means &ldquo;charge harder than planned&rdquo; — it needs only headroom.
                Positive means backing off or discharging, which costs degradation and risks a departure SoC.
                For a charging depot, downward flexibility is close to free and upward flexibility is expensive.
              </Note>
            </div>
          </>
        )}
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
