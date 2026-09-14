"use client";

import { BRP_OFFERS } from "@/lib/constants";
import { SCENARIOS } from "@/lib/scenarios";
import { num, qhToTime } from "@/lib/format";
import type { BrpOffer, DepotConfig, FeeConfig } from "@/lib/types";
import { Card, Chip, Note, NumberField, Slider, Toggle } from "./ui";

export function PhaseSetup({
  scenarioId,
  onScenario,
  brpId,
  onBrp,
  depot,
  onDepot,
  fees,
  onFees,
}: {
  scenarioId: string;
  onScenario: (id: string) => void;
  brpId: string;
  onBrp: (id: string) => void;
  depot: DepotConfig;
  onDepot: (d: DepotConfig) => void;
  fees: FeeConfig;
  onFees: (f: FeeConfig) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card
        title="1 · Pick the day"
        subtitle="Four synthetic German delivery days. Each isolates one lesson."
        className="lg:col-span-12"
      >
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {SCENARIOS.map((s) => {
            const active = s.id === scenarioId;
            const da = s.points.map((p) => p.dayAhead);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onScenario(s.id)}
                className="rounded-xl p-3.5 text-left transition-colors"
                style={{
                  border: `1.5px solid ${active ? "var(--series-1)" : "var(--border)"}`,
                  background: active ? "var(--accent-soft)" : "var(--surface-2)",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13.5px] font-semibold">{s.name}</span>
                  {active && <Chip tone="info">selected</Chip>}
                </div>
                <p className="mt-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  {s.subtitle}
                </p>
                <Sparkline values={da} />
                <p className="tnum mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  day-ahead {num(Math.min(...da), 0)} … {num(Math.max(...da), 0)} €/MWh
                </p>
                <p className="mt-2 text-[11.5px]" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Teaches: </strong>
                  {s.teaches}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card
        title="2 · Pick your BRP"
        subtitle="You will never be the BRP yourself — a 10-truck depot cannot justify a Bilanzkreisvertrag. You buy the role. These are the three commercial models that actually exist."
        className="lg:col-span-12"
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {BRP_OFFERS.map((b) => (
            <BrpCard key={b.id} offer={b} active={b.id === brpId} onSelect={() => onBrp(b.id)} />
          ))}
        </div>
        <div className="mt-4">
          <Note kind="legal" title="What you are actually buying">
            Access to their Bilanzkreis and their Bilanzkreisvertrag with the TSO; schedule nomination on
            your behalf by 14:30 D-1; market access; a share of the imbalance risk; and settlement handling.
            The one row people never read is <strong>credit pass-through</strong> — a contract that charges
            you the full reBAP but pays you only part of it is a private two-price scheme hiding inside a
            single-price regulatory regime.
          </Note>
        </div>
      </Card>

      <Card title="3 · The depot" subtitle="Ten electric trucks, one grid connection." className="lg:col-span-7">
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <NumberField
            label="Grid connection"
            value={depot.gridConnectionKw}
            step={50}
            min={200}
            max={5000}
            suffix="kW"
            onChange={(v) => onDepot({ ...depot, gridConnectionKw: v })}
          />
          <NumberField
            label="Battery per truck"
            value={depot.trucks[0].capacityKwh}
            step={20}
            min={200}
            max={1000}
            suffix="kWh"
            onChange={(v) => onDepot({ ...depot, trucks: depot.trucks.map((t) => ({ ...t, capacityKwh: v })) })}
          />
          <NumberField
            label="Charger power"
            value={depot.trucks[0].maxChargeKw}
            step={25}
            min={50}
            max={1000}
            suffix="kW"
            onChange={(v) => onDepot({ ...depot, trucks: depot.trucks.map((t) => ({ ...t, maxChargeKw: v })) })}
          />
          <NumberField
            label="V2G discharge power"
            value={depot.trucks[0].maxDischargeKw}
            step={25}
            min={0}
            max={500}
            suffix="kW"
            onChange={(v) => onDepot({ ...depot, trucks: depot.trucks.map((t) => ({ ...t, maxDischargeKw: v })) })}
          />
          <Slider
            label="Required SoC at departure"
            value={Math.round(depot.socRequiredAtDeparture * 100)}
            min={60}
            max={100}
            step={1}
            format={(v) => `${v} %`}
            onChange={(v) => onDepot({ ...depot, socRequiredAtDeparture: v / 100 })}
          />
          <Slider
            label="SoC floor"
            value={Math.round(depot.socFloor * 100)}
            min={5}
            max={50}
            step={1}
            format={(v) => `${v} %`}
            onChange={(v) => onDepot({ ...depot, socFloor: v / 100 })}
          />
          <Slider
            label="Battery degradation"
            value={depot.degradationEurPerKwh}
            min={0}
            max={0.15}
            step={0.005}
            format={(v) => `${v.toFixed(3)} €/kWh`}
            hint="The single most leveraged assumption in any V2G business case."
            onChange={(v) => onDepot({ ...depot, degradationEurPerKwh: v })}
          />
          <Slider
            label="Round-trip efficiency"
            value={Math.round(depot.chargeEfficiency * 100)}
            min={80}
            max={99}
            step={1}
            format={(v) => `${v} % each way → ${Math.round(v * v) / 100} % round trip`}
            onChange={(v) => onDepot({ ...depot, chargeEfficiency: v / 100, dischargeEfficiency: v / 100 })}
          />
        </div>

        <div className="mt-4">
          <Toggle
            label="Enable V2G (bidirectional discharge)"
            checked={depot.v2gEnabled}
            hint="Off by default. Discharging costs degradation, risks the departure SoC, and usually needs a battery-warranty conversation."
            onChange={(v) => onDepot({ ...depot, v2gEnabled: v })}
          />
        </div>

        <div className="scroll-x mt-4">
        <table className="data">
          <thead>
            <tr>
              <th>Truck</th>
              <th>Start SoC</th>
              <th>Departs</th>
              <th>Returns</th>
              <th>Shift energy</th>
            </tr>
          </thead>
          <tbody>
            {depot.trucks.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td className="tnum">{Math.round(t.startSoc * 100)} %</td>
                <td className="mono">{qhToTime(t.departQh)}</td>
                <td className="mono">{qhToTime(t.returnQh)}</td>
                <td className="tnum">{t.shiftConsumptionKwh} kWh</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <Card
        title="4 · Costs outside the energy price"
        subtitle="For a depot these usually dominate. Anyone pitching V2G revenue without them is selling you the fourth-best thing first."
        className="lg:col-span-5"
      >
        <div className="grid gap-3">
          <NumberField
            label="Grid fees, levies, tax"
            value={fees.gridAndLeviesEurPerMwh}
            step={5}
            suffix="€/MWh"
            onChange={(v) => onFees({ ...fees, gridAndLeviesEurPerMwh: v })}
          />
          <NumberField
            label="Peak power charge"
            value={fees.peakPowerEurPerKwYear}
            step={10}
            suffix="€/kW·a"
            onChange={(v) => onFees({ ...fees, peakPowerEurPerKwYear: v })}
          />
          <NumberField
            label="Exchange fee (day-ahead)"
            value={fees.exchangeFeeDayAheadEurPerMwh}
            step={0.01}
            suffix="€/MWh"
            onChange={(v) => onFees({ ...fees, exchangeFeeDayAheadEurPerMwh: v })}
          />
          <NumberField
            label="Exchange fee (intraday)"
            value={fees.exchangeFeeIntradayEurPerMwh}
            step={0.01}
            suffix="€/MWh"
            onChange={(v) => onFees({ ...fees, exchangeFeeIntradayEurPerMwh: v })}
          />
          <NumberField
            label="Clearing fee"
            value={fees.clearingFeeEurPerMwh}
            step={0.005}
            suffix="€/MWh"
            onChange={(v) => onFees({ ...fees, clearingFeeEurPerMwh: v })}
          />
          <NumberField
            label="Intraday half-spread"
            value={fees.intradayHalfSpreadEurPerMwh}
            step={0.25}
            suffix="€/MWh"
            onChange={(v) => onFees({ ...fees, intradayHalfSpreadEurPerMwh: v })}
          />
          <NumberField
            label="Spread widening near gate closure"
            value={fees.lateSpreadMultiplier}
            step={0.1}
            suffix="×"
            onChange={(v) => onFees({ ...fees, lateSpreadMultiplier: v })}
          />
          <NumberField
            label="Cost of a missed departure"
            value={fees.operationalFailurePenaltyEur}
            step={100}
            suffix="€"
            onChange={(v) => onFees({ ...fees, operationalFailurePenaltyEur: v })}
          />
        </div>
        <div className="mt-4">
          <Note kind="warn" title="Ordering matters">
            For most depots the value ranking is: avoid peak grid charges &gt; day-ahead arbitrage &gt;
            intraday re-optimisation &gt; balancing markets. The first needs no market role at all.
          </Note>
        </div>
      </Card>
    </div>
  );
}

function BrpCard({ offer, active, onSelect }: { offer: BrpOffer; active: boolean; onSelect: () => void }) {
  const modelLabel =
    offer.model === "passThrough"
      ? "Model A — pass-through"
      : offer.model === "pooled"
        ? "Model B — pooled / netted"
        : "Model C — full-service";
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-xl p-4 text-left transition-colors"
      style={{
        border: `1.5px solid ${active ? "var(--series-1)" : "var(--border)"}`,
        background: active ? "var(--accent-soft)" : "var(--surface-2)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[14px] font-semibold">{offer.name}</span>
        {active && <Chip tone="info">selected</Chip>}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold" style={{ color: "var(--series-1)" }}>
        {modelLabel}
      </div>
      <p className="mt-1.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
        {offer.tagline}
      </p>
      <div className="scroll-x mt-3">
      <table className="data">
        <tbody>
          <Kv k="Fixed fee" v={`€${offer.monthlyFeeEur}/month`} />
          <Kv k="Energy fee" v={`${offer.energyFeeEurPerMwh} €/MWh`} />
          <Kv
            k="Imbalance"
            v={
              offer.model === "passThrough"
                ? "100 % yours"
                : offer.model === "pooled"
                  ? `netted ×${offer.poolNettingFactor}`
                  : "absorbed"
            }
          />
          <Kv k="Tolerance band" v={offer.toleranceBand ? `±${offer.toleranceBand * 100} %` : "none"} />
          <Kv
            k="Outside band"
            v={
              offer.outOfBandFlatEurPerMwh
                ? `${offer.outOfBandFlatEurPerMwh} €/MWh flat`
                : offer.outOfBandMultiplier > 1
                  ? `reBAP ×${offer.outOfBandMultiplier}`
                  : "—"
            }
          />
          <Kv
            k="Credits passed through"
            v={`${Math.round(offer.creditPassThrough * 100)} %`}
            warn={offer.creditPassThrough < 1}
          />
          <Kv k="Premium" v={offer.insurancePremiumEurPerMwh ? `${offer.insurancePremiumEurPerMwh} €/MWh` : "—"} />
          <Kv k="Intraday access" v={offer.intradayAccess ? "yes" : "no"} warn={!offer.intradayAccess} />
          <Kv k="Balancing access" v={offer.balancingAccess ? "yes" : "no"} warn={!offer.balancingAccess} />
          <Kv k="Their nomination cut-off" v={offer.nominationCutoff} />
          <Kv k="Collateral" v={`€${offer.collateralEur.toLocaleString("en-GB")}`} />
        </tbody>
      </table>
      </div>
    </button>
  );
}

function Kv({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <tr>
      <td className="wrap" style={{ color: "var(--text-secondary)" }}>{k}</td>
      <td className="tnum font-semibold" style={{ color: warn ? "var(--serious)" : "var(--text-primary)" }}>
        {v}
      </td>
    </tr>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 26}`)
    .join(" ");
  const zeroY = 28 - ((0 - min) / span) * 26;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-[30px] w-full" aria-hidden="true">
      {min < 0 && max > 0 && (
        <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="var(--border-strong)" strokeWidth="0.5" strokeDasharray="2 2" />
      )}
      <polyline points={pts} fill="none" stroke="var(--series-1)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
