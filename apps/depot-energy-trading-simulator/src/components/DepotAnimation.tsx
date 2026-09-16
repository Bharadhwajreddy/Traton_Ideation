"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { num, qhToTime } from "@/lib/format";
import type { DepotConfig, SimulationResult } from "@/lib/types";
import { QH_PER_DAY } from "@/lib/types";
import { Card } from "./ui";

type TruckState = "charging" | "discharging" | "idle" | "away";

function stateOf(power: number, plugged: boolean): TruckState {
  if (!plugged) return "away";
  if (power > 0.5) return "charging";
  if (power < -0.5) return "discharging";
  return "idle";
}

const STATE_STYLE: Record<TruckState, { body: string; label: string; tone: string }> = {
  charging: { body: "var(--series-1)", label: "charging", tone: "var(--series-1)" },
  discharging: { body: "var(--series-2)", label: "discharging", tone: "var(--series-2)" },
  idle: { body: "var(--border-strong)", label: "plugged in, idle", tone: "var(--text-muted)" },
  away: { body: "var(--text-muted)", label: "on the road", tone: "var(--text-muted)" },
};

/** One truck, drawn from the side, with its battery as a bar underneath. */
function Truck({
  name,
  soc,
  power,
  plugged,
  socFloor,
  socTarget,
}: {
  name: string;
  soc: number;
  power: number;
  plugged: boolean;
  socFloor: number;
  socTarget: number;
}) {
  const state = stateOf(power, plugged);
  const style = STATE_STYLE[state];
  const pct = Math.max(0, Math.min(1, soc));
  const barColor = pct < socFloor + 0.03 ? "var(--critical)" : pct >= socTarget - 0.005 ? "var(--good)" : "var(--serious)";

  return (
    <div
      className="rounded-lg p-2"
      style={{
        background: state === "away" ? "transparent" : "var(--surface-2)",
        border: `1px solid ${state === "away" ? "var(--border)" : "var(--border-strong)"}`,
        opacity: state === "away" ? 0.45 : 1,
        transition: "opacity .3s, background .3s",
      }}
    >
      <svg viewBox="0 0 120 54" className="w-full" role="img" aria-label={`${name}: ${style.label}, ${Math.round(pct * 100)} % charged`}>
        {/* trailer */}
        <rect x="34" y="8" width="72" height="26" rx="3" fill={style.body} opacity={state === "away" ? 0.5 : 0.85} />
        {/* cab */}
        <path d="M6 34 L6 20 L18 20 L26 12 L34 12 L34 34 Z" fill={style.body} />
        <rect x="9" y="21" width="12" height="8" rx="1.5" fill="var(--surface-1)" opacity="0.85" />
        {/* wheels */}
        <circle cx="20" cy="38" r="6" fill="var(--text-primary)" opacity="0.8" />
        <circle cx="78" cy="38" r="6" fill="var(--text-primary)" opacity="0.8" />
        <circle cx="94" cy="38" r="6" fill="var(--text-primary)" opacity="0.8" />
        {/* charging cable + bolt, only while plugged */}
        {plugged && (
          <>
            <path d="M110 24 C 118 24, 118 44, 110 46" fill="none" stroke="var(--border-strong)" strokeWidth="2" />
            {state === "charging" && (
              <path d="M62 14 L54 24 L60 24 L57 30 L66 20 L60 20 Z" fill="var(--surface-1)">
                <animate attributeName="opacity" values="1;0.25;1" dur="1.1s" repeatCount="indefinite" />
              </path>
            )}
            {state === "discharging" && (
              <path d="M57 14 L66 24 L60 24 L63 30 L54 20 L60 20 Z" fill="var(--surface-1)">
                <animate attributeName="opacity" values="1;0.25;1" dur="1.1s" repeatCount="indefinite" />
              </path>
            )}
          </>
        )}
        {/* motion lines while away */}
        {state === "away" && (
          <g stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
            <line x1="112" y1="16" x2="118" y2="16"><animate attributeName="opacity" values="0;1;0" dur="0.9s" repeatCount="indefinite" /></line>
            <line x1="110" y1="24" x2="119" y2="24"><animate attributeName="opacity" values="0;1;0" dur="0.9s" begin="0.15s" repeatCount="indefinite" /></line>
            <line x1="113" y1="32" x2="118" y2="32"><animate attributeName="opacity" values="0;1;0" dur="0.9s" begin="0.3s" repeatCount="indefinite" /></line>
          </g>
        )}
      </svg>

      <div className="mt-1 h-[6px] w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, background: barColor, transition: "width .25s linear, background .25s" }}
        />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {name.replace("Truck ", "T")}
        </span>
        <span className="tnum text-[10.5px] font-semibold">{Math.round(pct * 100)}%</span>
      </div>
      <div className="tnum text-[9.5px]" style={{ color: style.tone }}>
        {state === "away" ? "on the road" : state === "idle" ? "idle" : `${Math.round(Math.abs(power))} kW ${state === "charging" ? "in" : "out"}`}
      </div>
    </div>
  );
}

export function DepotAnimation({
  result,
  depot,
}: {
  result: SimulationResult;
  depot: DepotConfig;
}) {
  const [qh, setQh] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6); // quarter hours per second
  const raf = useRef<number | null>(null);
  const last = useRef(0);

  const step = useCallback(
    (t: number) => {
      if (!last.current) last.current = t;
      const dt = t - last.current;
      if (dt >= 1000 / speed) {
        last.current = t;
        setQh((q) => (q + 1) % QH_PER_DAY);
      }
      raf.current = requestAnimationFrame(step);
    },
    [speed],
  );

  useEffect(() => {
    if (!playing) {
      if (raf.current) cancelAnimationFrame(raf.current);
      last.current = 0;
      return;
    }
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, step]);

  const q = result.perQh[qh];
  const away = result.fleet.filter((f) => !f.pluggedIn[qh]).length;
  const charging = result.fleet.filter((f) => f.pluggedIn[qh] && f.powerKw[qh] > 0.5).length;

  return (
    <Card
      title="Watch the day happen"
      subtitle="Ten identical trucks — the same truck, ten times over. Press play and follow one of them."
      className="lg:col-span-12"
      right={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="rounded-lg px-3 py-1.5 text-[13px] font-semibold"
            style={{ background: "var(--series-1)", color: "#fff" }}
          >
            {playing ? "❚❚ Pause" : "▶ Play the day"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setQh(0);
            }}
            className="rounded-lg px-3 py-1.5 text-[13px] font-semibold"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            ↺ Restart
          </button>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Playback speed"
          >
            <option value={3}>slow</option>
            <option value={6}>normal</option>
            <option value={16}>fast</option>
          </select>
        </div>
      }
    >
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Time
          </div>
          <div className="mono text-[26px] font-bold leading-none">{qhToTime(qh)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Electricity price now
          </div>
          <div className="tnum text-[19px] font-semibold leading-tight">{num(q.dayAhead)} €/MWh</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Depot drawing
          </div>
          <div className="tnum text-[19px] font-semibold leading-tight" style={{ color: "var(--series-1)" }}>
            {num(q.actualMw * 1000, 0)} kW
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Fleet
          </div>
          <div className="text-[14px] font-semibold leading-tight">
            {charging} charging · {result.fleet.length - away - charging} idle · {away} on the road
          </div>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={QH_PER_DAY - 1}
        value={qh}
        onChange={(e) => {
          setPlaying(false);
          setQh(Number(e.target.value));
        }}
        aria-label="Scrub through the day"
        className="mt-3"
      />
      <div className="mono flex justify-between text-[10.5px]" style={{ color: "var(--text-muted)" }}>
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {result.fleet.map((f) => (
          <Truck
            key={f.name}
            name={f.name}
            soc={f.soc[qh]}
            power={f.powerKw[qh]}
            plugged={f.pluggedIn[qh]}
            socFloor={depot.socFloor}
            socTarget={depot.socRequiredAtDeparture}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11.5px]" style={{ color: "var(--text-secondary)" }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--series-1)" }} /> charging
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--series-2)" }} /> discharging (V2G)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--border-strong)" }} /> plugged in but idle
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--text-muted)", opacity: 0.5 }} /> on the road
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          The bar under each truck is its battery. It must be green before the truck leaves.
        </span>
      </div>
    </Card>
  );
}
