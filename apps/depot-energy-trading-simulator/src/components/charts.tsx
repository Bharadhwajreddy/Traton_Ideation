"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { num, qhToTime } from "@/lib/format";

const AXIS = { stroke: "var(--border-strong)", fontSize: 11 } as const;

function hourTicks(every = 8): number[] {
  const t: number[] = [];
  for (let q = 0; q <= 96; q += every) t.push(q);
  return t;
}

/** A 1 / 2 / 5 × 10ⁿ step at or above the requested size. */
function niceStep(raw: number): number {
  const exp = Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const base = Math.pow(10, exp);
  const m = raw / base;
  const mult = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return mult * base;
}

/**
 * Domain that ignores extreme spikes so the everyday shape stays readable, then
 * snaps outward to round numbers so the axis labels are legible rather than
 * arbitrary. A quarter hour whose price sits outside the domain is still drawn —
 * `allowDataOverflow` clips the line, and the tooltip always reports the true value.
 */
function robustDomain(values: number[], targetTicks = 5): { domain: [number, number]; ticks: number[] } {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length === 0) return { domain: [0, 1], ticks: [0, 1] };
  const rawLo = clean[Math.floor(clean.length * 0.02)];
  const rawHi = clean[Math.min(clean.length - 1, Math.floor(clean.length * 0.98))];
  const step = niceStep(Math.max(rawHi - rawLo, 1) / targetTicks);
  const lo = Math.floor(rawLo / step) * step - step;
  const hi = Math.ceil(rawHi / step) * step + step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step * 0.5; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return { domain: [lo, hi], ticks };
}

function TooltipShell({ label, rows }: { label: string; rows: ReactNode }) {
  return (
    <div
      className="rounded-lg px-3 py-2 text-[12px] shadow-lg"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-strong)",
        color: "var(--text-primary)",
      }}
    >
      <div className="mono mb-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <table className="tnum">
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

function Row({ swatch, name, value }: { swatch?: string; name: string; value: string }) {
  return (
    <tr>
      <td className="pr-2 align-middle">
        {swatch && (
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ background: swatch }}
          />
        )}
        <span style={{ color: "var(--text-secondary)" }}>{name}</span>
      </td>
      <td className="pl-2 text-right font-semibold">{value}</td>
    </tr>
  );
}

export function Legend({
  items,
}: {
  items: { color: string; label: string; dashed?: boolean }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--text-secondary)" }}>
          <span
            className="inline-block h-[3px] w-4 rounded-full"
            style={{
              background: i.dashed
                ? `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)`
                : i.color,
            }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export interface PricePoint {
  qh: number;
  dayAhead: number;
  idIndex: number;
  rebap: number;
  balanceGCC: number;
  binding: string;
}

export function PriceChart({ data, height = 220 }: { data: PricePoint[]; height?: number }) {
  const { domain, ticks } = robustDomain([
    ...data.map((d) => d.dayAhead),
    ...data.map((d) => d.idIndex),
    ...data.map((d) => d.rebap),
  ]);
  const clipped = data.filter((d) => d.rebap > domain[1] || d.rebap < domain[0]);

  return (
    <>
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -6 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="qh"
          type="number"
          domain={[0, 95]}
          ticks={hourTicks()}
          tickFormatter={(q: number) => qhToTime(q)}
          {...AXIS}
        />
        <YAxis
          domain={domain}
          ticks={ticks}
          allowDataOverflow
          {...AXIS}
          width={56}
          tickFormatter={(v: number) => `${Math.round(v)}`}
        />
        <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3" />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as PricePoint;
            return (
              <TooltipShell
                label={`${qhToTime(Number(label))} – ${qhToTime(Number(label) + 1)}`}
                rows={
                  <>
                    <Row swatch="var(--series-1)" name="Day-ahead" value={`${num(d.dayAhead)} €/MWh`} />
                    <Row swatch="var(--series-2)" name="Intraday index" value={`${num(d.idIndex)} €/MWh`} />
                    <Row swatch="var(--series-3)" name="reBAP" value={`${num(d.rebap)} €/MWh`} />
                    <Row name="System balance" value={`${num(d.balanceGCC, 0)} MW ${d.balanceGCC > 0 ? "short" : "long"}`} />
                    <Row name="Set by" value={d.binding} />
                  </>
                }
              />
            );
          }}
        />
        <Line
          type="stepAfter"
          dataKey="rebap"
          stroke="var(--series-3)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          name="reBAP"
        />
        <Line
          type="monotone"
          dataKey="idIndex"
          stroke="var(--series-2)"
          strokeWidth={1.6}
          strokeDasharray="4 3"
          dot={false}
          isAnimationActive={false}
          name="Intraday index"
        />
        <Line
          type="stepAfter"
          dataKey="dayAhead"
          stroke="var(--series-1)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          name="Day-ahead"
        />
      </ComposedChart>
    </ResponsiveContainer>
    {clipped.length > 0 && (
      <p className="tnum mt-1 text-[11px]" style={{ color: "var(--serious)" }}>
        {clipped.length} quarter hour{clipped.length > 1 ? "s" : ""} outside the axis:{" "}
        {clipped
          .slice(0, 4)
          .map((d) => `${qhToTime(d.qh)} at ${num(d.rebap, 0)} €/MWh`)
          .join(", ")}
        {clipped.length > 4 ? " …" : ""}
      </p>
    )}
    </>
  );
}

// ---------------------------------------------------------------------------

export interface PowerPoint {
  qh: number;
  scheduled: number;
  actual: number;
  gridCap: number;
}

export function PowerChart({
  data,
  height = 190,
  gridCapMw,
}: {
  data: PowerPoint[];
  height?: number;
  gridCapMw: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="qh"
          type="number"
          domain={[0, 95]}
          ticks={hourTicks()}
          tickFormatter={(q: number) => qhToTime(q)}
          {...AXIS}
        />
        <YAxis {...AXIS} width={50} tickFormatter={(v: number) => num(v, 1)} />
        <ReferenceLine
          y={gridCapMw}
          stroke="var(--serious)"
          strokeDasharray="4 4"
          label={{
            value: "grid connection",
            position: "insideTopLeft",
            fill: "var(--serious)",
            fontSize: 10,
          }}
        />
        <ReferenceLine y={0} stroke="var(--border-strong)" />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as PowerPoint;
            return (
              <TooltipShell
                label={`${qhToTime(Number(label))} – ${qhToTime(Number(label) + 1)}`}
                rows={
                  <>
                    <Row swatch="var(--series-1)" name="Nominated" value={`${num(d.scheduled)} MW`} />
                    <Row swatch="var(--series-2)" name="Metered" value={`${num(d.actual)} MW`} />
                    <Row name="Deviation" value={`${num((d.actual - d.scheduled) * 0.25, 3)} MWh`} />
                  </>
                }
              />
            );
          }}
        />
        <Area
          type="stepAfter"
          dataKey="scheduled"
          stroke="var(--series-1)"
          strokeWidth={2}
          fill="var(--series-1)"
          fillOpacity={0.14}
          isAnimationActive={false}
        />
        <Line
          type="stepAfter"
          dataKey="actual"
          stroke="var(--series-2)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------

export function ImbalanceChart({
  data,
  height = 120,
}: {
  data: { qh: number; imbalanceMwh: number; eur: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 10, bottom: 4, left: 0 }} barCategoryGap={0}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="qh"
          type="number"
          domain={[0, 95]}
          ticks={hourTicks()}
          tickFormatter={(q: number) => qhToTime(q)}
          {...AXIS}
        />
        <YAxis {...AXIS} width={50} tickFormatter={(v: number) => num(v, 2)} />
        <ReferenceLine y={0} stroke="var(--border-strong)" />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { imbalanceMwh: number; eur: number };
            return (
              <TooltipShell
                label={`${qhToTime(Number(label))} – ${qhToTime(Number(label) + 1)}`}
                rows={
                  <>
                    <Row
                      name="Deviation"
                      value={`${num(d.imbalanceMwh, 3)} MWh ${d.imbalanceMwh > 0 ? "(short)" : d.imbalanceMwh < 0 ? "(long)" : ""}`}
                    />
                    <Row name="Settled" value={`${d.eur >= 0 ? "+" : "−"}€${num(Math.abs(d.eur))}`} />
                  </>
                }
              />
            );
          }}
        />
        <Bar dataKey="imbalanceMwh" isAnimationActive={false} radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.eur >= 0 ? "var(--series-1)" : "var(--critical)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------

export function SocChart({
  data,
  height = 170,
  socFloor,
  socTarget,
}: {
  data: { qh: number; meanSoc: number; pluggedIn: number }[];
  height?: number;
  socFloor: number;
  socTarget: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="qh"
          type="number"
          domain={[0, 95]}
          ticks={hourTicks()}
          tickFormatter={(q: number) => qhToTime(q)}
          {...AXIS}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          {...AXIS}
          width={40}
          tickFormatter={(v: number) => `${v}%`}
        />
        <ReferenceLine
          y={socTarget * 100}
          stroke="var(--good)"
          strokeDasharray="4 4"
          label={{ value: "departure SoC", position: "insideTopRight", fill: "var(--good)", fontSize: 10 }}
        />
        <ReferenceLine y={socFloor * 100} stroke="var(--critical)" strokeDasharray="4 4" />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { meanSoc: number; pluggedIn: number };
            return (
              <TooltipShell
                label={`${qhToTime(Number(label))}`}
                rows={
                  <>
                    <Row swatch="var(--series-1)" name="Fleet mean SoC" value={`${num(d.meanSoc, 1)} %`} />
                    <Row name="Plugged in" value={`${d.pluggedIn} of 10`} />
                  </>
                }
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="meanSoc"
          stroke="var(--series-1)"
          strokeWidth={2}
          fill="var(--series-1)"
          fillOpacity={0.16}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------

export function PnlBars({
  lines,
  height,
}: {
  lines: { label: string; value: number; detail: string }[];
  height?: number;
}) {
  const h = height ?? Math.max(220, lines.length * 42 + 36);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={lines} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" {...AXIS} tickFormatter={(v: number) => `€${v}`} />
        <YAxis type="category" dataKey="label" width={186} {...AXIS} interval={0} />
        <ReferenceLine x={0} stroke="var(--border-strong)" />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { label: string; value: number; detail: string };
            return (
              <TooltipShell
                label={d.label}
                rows={
                  <>
                    <Row name={d.value >= 0 ? "Revenue" : "Cost"} value={`${d.value >= 0 ? "+" : "−"}€${num(Math.abs(d.value))}`} />
                    <Row name="" value={d.detail} />
                  </>
                }
              />
            );
          }}
        />
        <Bar dataKey="value" isAnimationActive={false} radius={[0, 3, 3, 0]}>
          {lines.map((l, i) => (
            <Cell key={i} fill={l.value >= 0 ? "var(--series-1)" : "var(--critical)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
