"use client";

import { useMemo, useState } from "react";
import {
  BRP_OFFERS,
  DEFAULT_BALANCING,
  DEFAULT_DEPOT,
  DEFAULT_FEES,
  EMPTY_BALANCING_OFFER,
  getBrp,
  TRUCK_TEMPLATE,
} from "@/lib/constants";
import type { PassiveBalancingConfig, PlanMode } from "@/lib/depot";
import { eur, num } from "@/lib/format";
import { getScenario, SCENARIOS } from "@/lib/scenarios";
import { simulate, type SimulationInput } from "@/lib/simulate";
import { buildStages, factsFrom } from "@/lib/stages";
import type { BalancingConfig, BalancingOffer, DepotConfig, FeeConfig } from "@/lib/types";
import { ActorLegend, Flow } from "@/components/Flow";
import { PhaseDayAhead } from "@/components/PhaseDayAhead";
import { PhaseDelivery } from "@/components/PhaseDelivery";
import { PhaseIntraday } from "@/components/PhaseIntraday";
import { PhaseSettlement } from "@/components/PhaseSettlement";
import { PhaseSetup } from "@/components/PhaseSetup";
import { Button, Chip } from "@/components/ui";

const qhClock = (qh: number) =>
  `${String(Math.floor(qh / 4)).padStart(2, "0")}:${String((qh % 4) * 15).padStart(2, "0")}`;

export default function Page() {
  const [stageIdx, setStageIdx] = useState(0);
  const [scenarioId, setScenarioId] = useState("weekday");
  const [brpId, setBrpId] = useState("flexpool");
  const [depot, setDepot] = useState<DepotConfig>(DEFAULT_DEPOT);
  const [fees, setFees] = useState<FeeConfig>(DEFAULT_FEES);
  const [showDetail, setShowDetail] = useState(false);
  // Balancing-market participation (FCR / aFRR / mFRR) is out of scope, so no
  // offer is ever made. The engine keeps the maths; only the UI is gone.
  const balancing: BalancingConfig = DEFAULT_BALANCING;
  const balancingOffer: BalancingOffer = EMPTY_BALANCING_OFFER;
  const [planMode, setPlanMode] = useState<PlanMode>("cheapest");
  const [priceThreshold, setPriceThreshold] = useState(60);
  const [intradayCloseFraction, setIntradayCloseFraction] = useState(0.8);
  const [passive, setPassive] = useState<PassiveBalancingConfig>({ enabled: false, strength: 0.25 });

  const scenario = getScenario(scenarioId);
  const brp = getBrp(brpId);

  const input: SimulationInput = useMemo(
    () => ({
      scenario, depot, brp, fees, balancing, balancingOffer,
      planMode, priceThreshold, intradayCloseFraction, passive,
    }),
    [scenario, depot, brp, fees, balancing, balancingOffer, planMode, priceThreshold, intradayCloseFraction, passive],
  );

  const result = useMemo(() => simulate(input), [input]);
  const stages = useMemo(
    () => buildStages(factsFrom(result, brp.name, brp.intradayAccess)),
    [result, brp],
  );

  const stage = stages[stageIdx];
  const goto = (i: number) => {
    setStageIdx(Math.max(0, Math.min(stages.length - 1, i)));
    setShowDetail(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6">
      {/* ------------------------------------------------------------ header */}
      <header className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[21px] font-bold leading-tight sm:text-[25px]">
              One day in the life of a truck depot
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
              Ten identical electric trucks, one German electricity market, followed from the auction the day
              before to the bill weeks later.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/explainer.html"
              className="rounded-lg px-2.5 py-1 text-[12px] font-semibold no-underline"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Read the market explainer ↗
            </a>
            <Chip tone="info">{scenario.name}</Chip>
            <Chip>{brp.name}</Chip>
          </div>
        </div>
      </header>

      {/* ------------------------------------------- who is who (always on) */}
      <section className="mb-4">
        <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          The four people in this story — these colours never change
        </h2>
        <ActorLegend />
      </section>

      {/* ------------------------------------------------------- the timeline */}
      <nav
        className="sticky top-0 z-20 -mx-4 mb-4 overflow-x-auto px-4 py-2 sm:mx-0 sm:rounded-xl sm:px-2"
        style={{
          background: "var(--surface-0)",
          borderBottom: "1px solid var(--border)",
        }}
        aria-label="Timeline"
      >
        <ol className="m-0 flex min-w-max list-none items-stretch gap-1 p-0">
          {stages.map((s, i) => {
            const active = i === stageIdx;
            const done = i < stageIdx;
            return (
              <li key={s.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => goto(i)}
                  className="rounded-lg px-2.5 py-1.5 text-left transition-colors"
                  style={{
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: `1px solid ${active ? "var(--series-1)" : "transparent"}`,
                    minWidth: 128,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="tnum flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        background: active || done ? "var(--series-1)" : "var(--surface-2)",
                        color: active || done ? "#fff" : "var(--text-muted)",
                      }}
                    >
                      {s.n}
                    </span>
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
                    >
                      {shortTitle(s.title)}
                    </span>
                  </div>
                  <div className="mt-0.5 pl-[23px] text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {s.clock}
                  </div>
                </button>
                {i < stages.length - 1 && (
                  <span aria-hidden="true" style={{ color: "var(--border-strong)" }}>
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ---------------------------------------------------------- the stage */}
      <main>
        <article className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums"
              style={{ background: "var(--series-1)", color: "#fff" }}
            >
              {stage.clock}
            </span>
            <h2 className="m-0 text-[19px] font-bold leading-tight sm:text-[22px]">{stage.title}</h2>
          </div>

          <p
            className="mt-2.5 max-w-[68ch] text-[15px] font-semibold leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {stage.oneLiner}
          </p>
          <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {stage.plain}
          </p>

          {/* the flow */}
          <h3 className="mb-2 mt-5 text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Who says what to whom — read it top to bottom, like a conversation
          </h3>
          <Flow
            actors={stage.actors}
            steps={stage.steps}
            caption="Solid arrow = information. Dashed arrow = money. ⚡ = actual electricity."
          />

          {/* watch out */}
          {stage.watchOut && (
            <div
              className="mt-4 rounded-lg border p-3"
              style={{
                borderColor: "var(--warning)",
                background: "color-mix(in srgb, var(--warning) 9%, transparent)",
              }}
            >
              <div className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                {stage.watchOut.title}
              </div>
              <p className="mt-1 max-w-[68ch] text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {stage.watchOut.body}
              </p>
            </div>
          )}

          {/* takeaways */}
          <ul className="mt-4 m-0 list-none space-y-1.5 p-0">
            {stage.takeaways.map((t) => (
              <li key={t} className="flex gap-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                <span aria-hidden="true" style={{ color: "var(--series-3)" }}>
                  ✓
                </span>
                <span className="max-w-[66ch]">{t}</span>
              </li>
            ))}
          </ul>

          {/* the depot card, only on stage 0 */}
          {stage.n === 0 && <OneTruckCard depot={depot} />}

          {/* the full numbers, collapsed */}
          {stage.detailPhase && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <Button variant="ghost" onClick={() => setShowDetail((v) => !v)}>
                {showDetail ? "Hide the full numbers ▲" : "Show the full numbers, charts and controls ▼"}
              </Button>
              {showDetail && (
                <div className="mt-4">
                  {stage.detailPhase === "setup" && (
                    <PhaseSetup
                      scenarioId={scenarioId} onScenario={setScenarioId}
                      brpId={brpId} onBrp={setBrpId}
                      depot={depot} onDepot={setDepot}
                      fees={fees} onFees={setFees}
                    />
                  )}
                  {stage.detailPhase === "dayAhead" && (
                    <PhaseDayAhead
                      scenario={scenario} result={result} depot={depot} brp={brp}
                      planMode={planMode} onPlanMode={setPlanMode}
                      priceThreshold={priceThreshold} onPriceThreshold={setPriceThreshold}
                    />
                  )}
                  {stage.detailPhase === "intraday" && (
                    <PhaseIntraday
                      scenario={scenario} result={result} brp={brp} fees={fees}
                      closeFraction={intradayCloseFraction} onCloseFraction={setIntradayCloseFraction}
                      gridCapMw={depot.gridConnectionKw / 1000}
                    />
                  )}
                  {stage.detailPhase === "delivery" && (
                    <PhaseDelivery
                      result={result} depot={depot} onDepot={setDepot} brp={brp}
                      passive={passive} onPassive={setPassive}
                    />
                  )}
                  {stage.detailPhase === "settlement" && (
                    <PhaseSettlement result={result} brp={brp} input={input} onBrp={setBrpId} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* the nomination stage gets the 96 numbers instead of a detail panel */}
          {stage.id === "nomination" && <NominationStrip result={result} />}
        </article>
      </main>

      {/* ------------------------------------------------------------- nav */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" disabled={stageIdx === 0} onClick={() => goto(stageIdx - 1)}>
          ← {stageIdx > 0 ? shortTitle(stages[stageIdx - 1].title) : "Back"}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              const next = SCENARIOS[(SCENARIOS.findIndex((s) => s.id === scenarioId) + 1) % SCENARIOS.length];
              setScenarioId(next.id);
            }}
          >
            Try another day →
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const next = BRP_OFFERS[(BRP_OFFERS.findIndex((b) => b.id === brpId) + 1) % BRP_OFFERS.length];
              setBrpId(next.id);
            }}
          >
            Try another BRP →
          </Button>
        </div>
        <Button disabled={stageIdx === stages.length - 1} onClick={() => goto(stageIdx + 1)}>
          {stageIdx < stages.length - 1 ? shortTitle(stages[stageIdx + 1].title) : "Done"} →
        </Button>
      </div>

      {/* running total, always visible */}
      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
      >
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          Where the day ends up, with today&apos;s settings
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Chip tone={result.net >= 0 ? "good" : "bad"}>
            {eur(result.net)} for the day
          </Chip>
          <Chip>{num(result.totals.effectiveEurPerMwh)} €/MWh all-in</Chip>
          {result.totals.failures.length > 0 && (
            <Chip tone="bad">{result.totals.failures.length} missed departure(s)</Chip>
          )}
        </span>
      </div>

      <footer className="mt-8 border-t pt-4 text-[11.5px] hairline" style={{ color: "var(--text-muted)" }}>
        <p>
          Prices are <strong>synthetic and calibrated</strong>, not historical — do not cite them as data. The
          reBAP engine implements the German TSOs&apos; model description valid from 01.11.2023 (BNetzA
          BK6-21-192); the BRP duties and deadlines come from the Standard-Bilanzkreisvertrag approved by
          BNetzA BK6-18-061, superseded by BK6-23-102 from 01.10.2024. Full sourcing:{" "}
          <span className="mono">energy-markets/docs/</span>, or the walkthrough at{" "}
          <a href="/explainer.html">/explainer.html</a>.
        </p>
      </footer>
    </div>
  );
}

function shortTitle(t: string) {
  return t.split(" — ")[0].split(" — ")[0];
}

/** Stage 0: the one truck, and the fact that there are ten of it. */
function OneTruckCard({ depot }: { depot: DepotConfig }) {
  const t = TRUCK_TEMPLATE;
  const rows: [string, string][] = [
    ["Battery", `${t.capacityKwh} kWh`],
    ["Charger", `${t.maxChargeKw} kW`],
    ["Leaves the depot", qhClock(t.departQh)],
    ["Comes back", qhClock(t.returnQh)],
    ["Uses on the shift", `${t.shiftConsumptionKwh} kWh`],
    ["Charge on arrival", `${Math.round(t.startSoc * 100)} %`],
    ["Must be full by", `${Math.round(depot.socRequiredAtDeparture * 100)} % at ${qhClock(t.departQh)}`],
  ];
  return (
    <div
      className="mt-5 rounded-xl border p-3.5"
      style={{ borderColor: "var(--series-2)", background: "color-mix(in srgb, var(--series-2) 6%, transparent)" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-[14px] font-bold">One truck</h3>
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-bold"
          style={{ background: "var(--series-2)", color: "#fff" }}
        >
          × 10, all identical
        </span>
      </div>
      <p className="mt-1.5 max-w-[68ch] text-[12.5px] leading-snug" style={{ color: "var(--text-secondary)" }}>
        All ten leave at the same minute, drive the same distance and plug back in at the same minute. The whole
        depot behaves like one big truck — which is exactly why the numbers below are easy to check by hand.
      </p>
      <div className="mt-2.5 grid gap-x-5 gap-y-1 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b pb-1" style={{ borderColor: "var(--border)" }}>
            <span className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>{k}</span>
            <span className="tnum text-[12.5px] font-semibold">{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
        Ten trucks × {t.shiftConsumptionKwh} kWh ={" "}
        <strong>{((t.shiftConsumptionKwh * 10) / 1000).toFixed(2)} MWh</strong> to put back every night, through a{" "}
        <strong>{(depot.gridConnectionKw / 1000).toFixed(1)} MW</strong> connection.
      </p>
    </div>
  );
}

/** Stage 2: what "96 numbers" actually looks like. */
function NominationStrip({ result }: { result: ReturnType<typeof simulate> }) {
  const max = Math.max(0.001, ...result.perQh.map((p) => Math.abs(p.scheduledMw)));
  const sample = [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88];
  return (
    <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <h3 className="mb-1 text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        The promise itself — 96 numbers, one per quarter hour
      </h3>
      <p className="mb-2.5 max-w-[68ch] text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
        This is literally what your BRP sends the TSO. Nothing else. Every bar is a quarter hour, and its height is
        how much your balance group has promised to draw.
      </p>
      <div className="flex items-end gap-px" style={{ height: 72 }} aria-hidden="true">
        {result.perQh.map((p) => (
          <div
            key={p.qh}
            className="flex-1 rounded-t-[1px]"
            style={{
              height: `${Math.max(2, (Math.abs(p.scheduledMw) / max) * 100)}%`,
              background: p.scheduledMw >= 0 ? "var(--series-1)" : "var(--series-3)",
              opacity: Math.abs(p.scheduledMw) < 1e-6 ? 0.18 : 1,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
        {sample.map((q) => (
          <span key={q}>{qhClock(q)}</span>
        ))}
      </div>
    </div>
  );
}
