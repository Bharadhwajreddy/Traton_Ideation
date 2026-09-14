"use client";

import { useMemo, useState } from "react";
import {
  BRP_OFFERS,
  DEFAULT_BALANCING,
  DEFAULT_DEPOT,
  DEFAULT_FEES,
  EMPTY_BALANCING_OFFER,
  getBrp,
} from "@/lib/constants";
import type { PassiveBalancingConfig, PlanMode } from "@/lib/depot";
import { eur, num } from "@/lib/format";
import { getScenario, SCENARIOS } from "@/lib/scenarios";
import { simulate, type SimulationInput } from "@/lib/simulate";
import type { BalancingConfig, BalancingOffer, DepotConfig, FeeConfig, Phase } from "@/lib/types";
import { PhaseDayAhead } from "@/components/PhaseDayAhead";
import { PhaseDelivery } from "@/components/PhaseDelivery";
import { PhaseIntraday } from "@/components/PhaseIntraday";
import { PhaseSettlement } from "@/components/PhaseSettlement";
import { PhaseSetup } from "@/components/PhaseSetup";
import { Button, Chip } from "@/components/ui";

const PHASES: { id: Phase; label: string; when: string; who: string }[] = [
  { id: "setup", label: "Setup", when: "before anything", who: "you" },
  { id: "dayAhead", label: "Day-ahead", when: "D-1 · 12:00 auction, 14:30 nomination", who: "exchange + your BRP" },
  { id: "intraday", label: "Intraday", when: "D-1 15:00 → QH − 5 min", who: "exchange + your BRP" },
  { id: "delivery", label: "Delivery", when: "real time on D", who: "you + the TSO" },
  { id: "settlement", label: "Settlement", when: "ex post, monthly", who: "TSO → BRP → you" },
];

export default function Page() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [scenarioId, setScenarioId] = useState("weekday");
  const [brpId, setBrpId] = useState("flexpool");
  const [depot, setDepot] = useState<DepotConfig>(DEFAULT_DEPOT);
  const [fees, setFees] = useState<FeeConfig>(DEFAULT_FEES);
  const [balancing, setBalancing] = useState<BalancingConfig>(DEFAULT_BALANCING);
  const [balancingOffer, setBalancingOffer] = useState<BalancingOffer>(EMPTY_BALANCING_OFFER);
  const [planMode, setPlanMode] = useState<PlanMode>("cheapest");
  const [priceThreshold, setPriceThreshold] = useState(60);
  const [intradayCloseFraction, setIntradayCloseFraction] = useState(0.8);
  const [passive, setPassive] = useState<PassiveBalancingConfig>({ enabled: false, strength: 0.25 });

  const scenario = getScenario(scenarioId);
  const brp = getBrp(brpId);

  const input: SimulationInput = useMemo(
    () => ({
      scenario,
      depot,
      brp,
      fees,
      balancing,
      balancingOffer,
      planMode,
      priceThreshold,
      intradayCloseFraction,
      passive,
    }),
    [scenario, depot, brp, fees, balancing, balancingOffer, planMode, priceThreshold, intradayCloseFraction, passive],
  );

  const result = useMemo(() => simulate(input), [input]);

  const phaseIndex = PHASES.findIndex((p) => p.id === phase);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6">
      <header className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[21px] font-bold leading-tight sm:text-[25px]">
              Depot Energy Trading Simulator
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
              Ten electric trucks in the German electricity market. Day-ahead, intraday, balancing and
              imbalance settlement — implemented from the TSOs&apos; own model descriptions.
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
            <Chip tone={result.net >= 0 ? "good" : "bad"}>
              {eur(result.net)} · {num(result.totals.effectiveEurPerMwh)} €/MWh
            </Chip>
            {result.totals.failures.length > 0 && (
              <Chip tone="bad">{result.totals.failures.length} missed departure(s)</Chip>
            )}
          </div>
        </div>
      </header>

      <nav className="card mb-4 overflow-x-auto p-1.5">
        <div className="flex min-w-max gap-1">
          {PHASES.map((p, i) => {
            const active = p.id === phase;
            const done = i < phaseIndex;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPhase(p.id)}
                className="flex-1 rounded-lg px-3 py-2 text-left transition-colors"
                style={{
                  background: active ? "var(--accent-soft)" : "transparent",
                  border: `1px solid ${active ? "var(--series-1)" : "transparent"}`,
                  minWidth: 170,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="tnum flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold"
                    style={{
                      background: active || done ? "var(--series-1)" : "var(--surface-2)",
                      color: active || done ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
                  >
                    {p.label}
                  </span>
                </div>
                <div className="mt-0.5 pl-[24px] text-[10.5px]" style={{ color: "var(--text-muted)" }}>
                  {p.when}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      <main>
        {phase === "setup" && (
          <PhaseSetup
            scenarioId={scenarioId}
            onScenario={setScenarioId}
            brpId={brpId}
            onBrp={setBrpId}
            depot={depot}
            onDepot={setDepot}
            fees={fees}
            onFees={setFees}
          />
        )}
        {phase === "dayAhead" && (
          <PhaseDayAhead
            scenario={scenario}
            result={result}
            depot={depot}
            brp={brp}
            planMode={planMode}
            onPlanMode={setPlanMode}
            priceThreshold={priceThreshold}
            onPriceThreshold={setPriceThreshold}
            balancing={balancing}
            balancingOffer={balancingOffer}
            onBalancingOffer={setBalancingOffer}
            onBalancing={setBalancing}
          />
        )}
        {phase === "intraday" && (
          <PhaseIntraday
            scenario={scenario}
            result={result}
            brp={brp}
            fees={fees}
            closeFraction={intradayCloseFraction}
            onCloseFraction={setIntradayCloseFraction}
            gridCapMw={depot.gridConnectionKw / 1000}
          />
        )}
        {phase === "delivery" && (
          <PhaseDelivery
            result={result}
            depot={depot}
            onDepot={setDepot}
            brp={brp}
            passive={passive}
            onPassive={setPassive}
          />
        )}
        {phase === "settlement" && (
          <PhaseSettlement result={result} brp={brp} input={input} onBrp={setBrpId} />
        )}
      </main>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={phaseIndex === 0}
          onClick={() => setPhase(PHASES[Math.max(0, phaseIndex - 1)].id)}
        >
          ← {PHASES[Math.max(0, phaseIndex - 1)].label}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              const next = SCENARIOS[(SCENARIOS.findIndex((s) => s.id === scenarioId) + 1) % SCENARIOS.length];
              setScenarioId(next.id);
            }}
          >
            Try the next day →
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const next = BRP_OFFERS[(BRP_OFFERS.findIndex((b) => b.id === brpId) + 1) % BRP_OFFERS.length];
              setBrpId(next.id);
            }}
          >
            Try the next BRP →
          </Button>
        </div>
        <Button
          disabled={phaseIndex === PHASES.length - 1}
          onClick={() => setPhase(PHASES[Math.min(PHASES.length - 1, phaseIndex + 1)].id)}
        >
          {PHASES[Math.min(PHASES.length - 1, phaseIndex + 1)].label} →
        </Button>
      </div>

      <footer className="mt-8 border-t pt-4 text-[11.5px] hairline" style={{ color: "var(--text-muted)" }}>
        <p>
          Prices are <strong>synthetic and calibrated</strong>, not historical — do not cite them as data. The
          reBAP engine implements the German TSOs&apos; model description valid from 01.11.2023 (BNetzA
          BK6-21-192); the BRP duties and deadlines come from the Standard-Bilanzkreisvertrag approved by
          BNetzA BK6-18-061. Full sourcing and every modelling assumption:{" "}
          <span className="mono">energy-markets/docs/</span> in this repository, or the visual walkthrough at{" "}
          <a href="/explainer.html">/explainer.html</a>.
        </p>
      </footer>
    </div>
  );
}
