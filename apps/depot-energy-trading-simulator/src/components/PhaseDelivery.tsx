"use client";

import { useState } from "react";
import type { PassiveBalancingConfig } from "@/lib/depot";
import { describePaymentDirection } from "@/lib/rebap";
import { eur, num, qhToTime } from "@/lib/format";
import type { BrpOffer, DepotConfig, SimulationResult } from "@/lib/types";
import { ImbalanceChart, Legend, PowerChart, PriceChart, SocChart } from "./charts";
import { DepotAnimation } from "./DepotAnimation";
import { Briefing, Card, Chip, Note, Slider, Stat, Toggle } from "./ui";

export function PhaseDelivery({
  result,
  depot,
  onDepot,
  brp,
  passive,
  onPassive,
}: {
  result: SimulationResult;
  depot: DepotConfig;
  onDepot: (d: DepotConfig) => void;
  brp: BrpOffer;
  passive: PassiveBalancingConfig;
  onPassive: (p: PassiveBalancingConfig) => void;
}) {
  // Default the inspector to the quarter hour with the largest settlement impact.
  const worst = result.perQh.reduce((a, b) => (Math.abs(b.imbalanceEur) > Math.abs(a.imbalanceEur) ? b : a));
  const [inspectQh, setInspectQh] = useState(worst.qh);
  const q = result.perQh[inspectQh];
  const r = q.rebap;

  const powerData = result.perQh.map((p) => ({
    qh: p.qh,
    scheduled: p.scheduledMw,
    actual: p.actualMw,
    gridCap: depot.gridConnectionKw / 1000,
  }));
  const imbData = result.perQh.map((p) => ({ qh: p.qh, imbalanceMwh: p.imbalanceMwh, eur: p.imbalanceEur }));
  const socData = result.perQh.map((p) => ({ qh: p.qh, meanSoc: p.meanSoc * 100, pluggedIn: p.pluggedIn }));
  const priceData = result.perQh.map((p) => ({
    qh: p.qh,
    dayAhead: p.dayAhead,
    idIndex: p.idIndex,
    rebap: p.rebap.rebapShort,
    balanceGCC: p.rebap.balanceGCC,
    binding: p.rebap.binding,
  }));

  const imbalanceLine = result.pnl.find((l) => l.key === "imbalance")!;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <Briefing title="What is happening on this screen?" href="/explainer.html#rebap">
          <p>
            The day runs for real. The depot dispatches its chargers to keep every truck&apos;s promise — and
            <strong> when the trading plan and the trucks disagree, the trucks win.</strong>
          </p>
          <p className="mt-2">
            Wherever the metered line leaves the nominated area, your balance group is out of position. Every one of
            those quarter hours gets repriced at the <strong>reBAP</strong>, the German imbalance price. The
            surprising part is that it can go <em>either way</em>: if your deviation happened to help the system, you
            are paid for it. The price is not measuring how badly you forecast — it is measuring what your error did
            to the grid.
          </p>
          <p className="mt-2">
            The inspector at the bottom shows how that price is built: three modules, and whichever is highest (when
            the system is short) or lowest (when it is long) sets the price.
          </p>
        </Briefing>
      </div>
      <DepotAnimation result={result} depot={depot} />

      <Card
        title="Delivery — the day actually happens"
        subtitle="Operations always win. A truck that must charge to make its departure will charge, whatever your schedule said. That override is where imbalance comes from."
        className="lg:col-span-12"
        right={
          <Legend
            items={[
              { color: "var(--series-1)", label: "Nominated" },
              { color: "var(--series-2)", label: "Metered" },
            ]}
          />
        }
      >
        <PowerChart data={powerData} gridCapMw={depot.gridConnectionKw / 1000} />
        <div className="mt-3">
          <div className="mb-1 text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>
            Deviation per quarter hour (MWh) — blue where it earns you money, red where it costs you
          </div>
          <ImbalanceChart data={imbData} />
        </div>
      </Card>

      <Card title="Fleet state of charge" subtitle="Mean across all ten trucks, including those on the road." className="lg:col-span-7">
        <SocChart data={socData} socFloor={depot.socFloor} socTarget={depot.socRequiredAtDeparture} />
        {result.totals.failures.length > 0 ? (
          <div className="mt-3">
            <Note kind="warn" title={`${result.totals.failures.length} truck(s) missed the required departure SoC`}>
              <ul className="mt-1 space-y-1">
                {result.totals.failures.map((f, i) => (
                  <li key={i} className="mono text-[11.5px]">
                    {f.truck} at {qhToTime(f.qh)} — {Math.round(f.soc * 100)} % (needed{" "}
                    {Math.round(depot.socRequiredAtDeparture * 100)} %)
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                This is not an energy cost. It is a swapped vehicle or a missed delivery window, and it dwarfs
                anything the imbalance price can do to you.
              </p>
            </Note>
          </div>
        ) : (
          <p className="mt-2 text-[12px]" style={{ color: "var(--good)" }}>
            <Chip tone="good">all departures met</Chip>
          </p>
        )}
      </Card>

      <Card title="Deliberate deviation" subtitle="You can lean with the system on purpose. Whether you should is a legal question as much as an economic one." className="lg:col-span-5">
        <Toggle
          label="Enable V2G discharge"
          checked={depot.v2gEnabled}
          hint="Lets the depot inject, not just modulate its charging."
          onChange={(v) => onDepot({ ...depot, v2gEnabled: v })}
        />
        <div className="mt-3">
          <Toggle
            label="Passive balancing — deviate to help the system"
            checked={passive.enabled}
            hint="Charge harder when the system is long and the reBAP is negative; back off or discharge when it is short and the reBAP is positive."
            onChange={(v) => onPassive({ ...passive, enabled: v })}
          />
        </div>
        {passive.enabled && (
          <div className="mt-3">
            <Slider
              label="How much of the grid connection you will swing"
              value={Math.round(passive.strength * 100)}
              min={5}
              max={100}
              step={5}
              format={(v) => `${v} % (${num((depot.gridConnectionKw * v) / 100000, 2)} MW)`}
              onChange={(v) => onPassive({ ...passive, strength: v / 100 })}
            />
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Stat
            label="Gross deviation"
            value={`${num(result.totals.absImbalanceMwh, 3)} MWh`}
            detail={`${num(result.totals.imbalanceRatePct, 1)} % of consumption`}
            tone={result.totals.imbalanceRatePct > 10 ? "warn" : "neutral"}
          />
          <Stat
            label="Net position"
            value={`${num(Math.abs(result.totals.grossImbalanceMwh), 3)} MWh`}
            detail={result.totals.grossImbalanceMwh >= 0 ? "short" : "long"}
          />
          <Stat
            label="Imbalance settled"
            value={eur(imbalanceLine.value)}
            tone={imbalanceLine.value >= 0 ? "good" : "bad"}
          />
          <Stat
            label="Discharged"
            value={`${num(result.totals.dischargedKwh, 0)} kWh`}
            detail={depot.v2gEnabled ? "V2G active" : "V2G off"}
          />
        </div>

        {passive.enabled && (
          <div className="mt-4">
            <Note kind="legal" title="Ziffer 5.2 of the Bilanzkreisvertrag">
              The BRP is obliged to keep deviations as small as reasonably possible, and drawing imbalance
              energy is <strong>only permissible to the extent it offsets non-forecastable deviations</strong>.
              Deliberate systematic self-balancing against the reBAP is a contractual breach — investigable
              under Ziffer 11.4, with REMIT on top. This toggle is here to show you what the incentive looks
              like and why the regulation has to say this out loud.
            </Note>
          </div>
        )}
      </Card>

      <Card
        title="Inspect the reBAP, quarter hour by quarter hour"
        subtitle="The three modules, and which one bound. This is the German TSOs' model description implemented literally."
        className="lg:col-span-12"
      >
        <div className="mb-3">
          <Slider
            label="Quarter hour"
            value={inspectQh}
            min={0}
            max={95}
            step={1}
            format={(v) => `${qhToTime(v)} – ${qhToTime(v + 1)}`}
            onChange={setInspectQh}
          />
        </div>

        <PriceChart data={priceData} height={180} />

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-5">
            <div className="scroll-x">
            <table className="data">
              <tbody>
                <tr>
                  <td className="wrap" style={{ color: "var(--text-secondary)" }}>System balance (Balance_GCC)</td>
                  <td className="tnum font-semibold">
                    {num(r.balanceGCC, 0)} MW{" "}
                    <Chip tone={r.balanceGCC > 0 ? "bad" : r.balanceGCC < 0 ? "info" : "neutral"}>
                      {r.balanceGCC > 0 ? "short" : r.balanceGCC < 0 ? "long" : "flat"}
                    </Chip>
                  </td>
                </tr>
                <ModuleRow name="Module 1 — base (PICASSO/MARI)" value={r.module1} bound={r.binding === "module1"} />
                <ModuleRow
                  name={`Module 2 — incentivising${r.coupled ? "" : " (index below 500 MW — not coupled)"}`}
                  value={r.module2}
                  bound={r.binding === "module2"}
                />
                <ModuleRow name="Module 3 — scarcity" value={r.module3} bound={r.binding === "module3"} />
                <tr>
                  <td style={{ color: "var(--text-secondary)" }}>ΔP (minimum distance)</td>
                  <td className="tnum">{num(r.deltaP)} €/MWh</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--text-secondary)" }}>
                    <strong>reBAP</strong>
                  </td>
                  <td className="tnum text-[15px] font-bold" style={{ color: "var(--series-3)" }}>
                    {num(r.rebapShort)} €/MWh
                    {r.asymmetric && <Chip tone="bad">asymmetric</Chip>}
                  </td>
                </tr>
                {r.asymmetric && (
                  <tr>
                    <td style={{ color: "var(--text-secondary)" }}>…for a LONG balance group</td>
                    <td className="tnum">{num(r.rebapLong)} €/MWh</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <div className="rounded-lg p-3.5" style={{ background: "var(--surface-2)" }}>
              <div className="text-[12px] font-semibold">
                {qhToTime(inspectQh)} – {qhToTime(inspectQh + 1)}
              </div>
              <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
                The system was{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {Math.abs(r.balanceGCC).toFixed(0)} MW {r.balanceGCC > 0 ? "short" : "long"}
                </strong>
                , so the reBAP is the <strong>{r.balanceGCC > 0 ? "maximum" : "minimum"}</strong> of the defined
                modules. Here that was{" "}
                <strong style={{ color: "var(--series-3)" }}>{bindingLabel(r.binding)}</strong>.
              </p>
              <div className="scroll-x mt-3">
              <table className="data">
                <tbody>
                  <tr>
                    <td style={{ color: "var(--text-secondary)" }}>Your deviation</td>
                    <td className="tnum">
                      {num(q.imbalanceMwh, 4)} MWh {q.imbalanceMwh > 0 ? "(short)" : q.imbalanceMwh < 0 ? "(long)" : ""}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-secondary)" }}>Payment direction</td>
                    <td className="font-semibold">{describePaymentDirection(q.imbalanceMwh, q.appliedRebap)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-secondary)" }}>Under {brp.name}</td>
                    <td className="tnum font-semibold" style={{ color: q.imbalanceEur >= 0 ? "var(--good)" : "var(--critical)" }}>
                      {q.imbalanceEur >= 0 ? "+" : "−"}
                      {eur(Math.abs(q.imbalanceEur), 2).replace("€", "€")}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-secondary)" }}>Nominated / metered</td>
                    <td className="tnum">
                      {num(q.scheduledMw, 3)} / {num(q.actualMw, 3)} MW
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 max-h-[280px] overflow-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Quarter hour</th>
                <th>Balance MW</th>
                <th>Module 1</th>
                <th>Module 2</th>
                <th>Module 3</th>
                <th>reBAP</th>
                <th>Set by</th>
                <th>Deviation MWh</th>
                <th>Settled €</th>
              </tr>
            </thead>
            <tbody>
              {result.perQh
                .filter(
                  (p) =>
                    Math.abs(p.imbalanceMwh) > 1e-6 ||
                    p.rebap.binding === "module3" ||
                    p.rebap.binding === "capacityReserve" ||
                    !p.rebap.coupled,
                )
                .map((p) => (
                  <tr
                    key={p.qh}
                    onClick={() => setInspectQh(p.qh)}
                    style={{ cursor: "pointer", background: p.qh === inspectQh ? "var(--accent-soft)" : undefined }}
                  >
                    <td className="mono">{qhToTime(p.qh)}</td>
                    <td className="tnum">{num(p.rebap.balanceGCC, 0)}</td>
                    <td className="tnum">{p.rebap.module1 === null ? "—" : num(p.rebap.module1)}</td>
                    <td className="tnum">{p.rebap.module2 === null ? "—" : num(p.rebap.module2)}</td>
                    <td className="tnum">{p.rebap.module3 === null ? "—" : num(p.rebap.module3)}</td>
                    <td className="tnum font-semibold" style={{ color: "var(--series-3)" }}>
                      {num(p.rebap.rebapShort)}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{bindingLabel(p.rebap.binding)}</td>
                    <td className="tnum">{num(p.imbalanceMwh, 4)}</td>
                    <td className="tnum" style={{ color: p.imbalanceEur >= 0 ? "var(--good)" : "var(--critical)" }}>
                      {p.imbalanceEur >= 0 ? "+" : "−"}
                      {num(Math.abs(p.imbalanceEur), 2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function bindingLabel(b: string): string {
  switch (b) {
    case "module1":
      return "Module 1 (base)";
    case "module2":
      return "Module 2 (incentivising)";
    case "module3":
      return "Module 3 (scarcity)";
    case "capacityReserve":
      return "KapResV § 32";
    default:
      return "undefined";
  }
}

function ModuleRow({ name, value, bound }: { name: string; value: number | null; bound: boolean }) {
  return (
    <tr style={{ background: bound ? "var(--accent-soft)" : undefined }}>
      <td className="wrap" style={{ color: bound ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: bound ? 600 : 400 }}>
        {name}
        {bound && <Chip tone="info">binding</Chip>}
      </td>
      <td className="tnum" style={{ fontWeight: bound ? 700 : 400 }}>
        {value === null ? "not applicable" : `${num(value)} €/MWh`}
      </td>
    </tr>
  );
}
