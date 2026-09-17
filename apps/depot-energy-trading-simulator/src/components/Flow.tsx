"use client";

import { ACTORS, type ActorId } from "@/lib/actors";

/**
 * A sequence diagram: the actors stand side by side, time runs DOWNWARDS, and
 * every arrow is one message someone sends to someone else.
 *
 * It is drawn in plain HTML rather than SVG on purpose — the message labels are
 * full sentences, and HTML wraps them for free at any screen width. Below the
 * `sm` breakpoint the diagram is replaced by the same steps as a numbered list,
 * because four lifelines will not fit on a phone.
 */

export type StepKind = "info" | "money" | "power";

export interface FlowStep {
  from: ActorId;
  to: ActorId;
  /** What is actually said or sent. Written as speech wherever possible. */
  msg: string;
  /** Optional second line: why this happens, or what it means. */
  detail?: string;
  kind?: StepKind;
  /** Clock time for this specific message, if it has one. */
  at?: string;
}

const KIND_STYLE: Record<StepKind, { dash: string; glyph: string; word: string }> = {
  info: { dash: "none", glyph: "", word: "information" },
  money: { dash: "5 4", glyph: "€", word: "money" },
  power: { dash: "none", glyph: "⚡", word: "electricity" },
};

export function Flow({
  actors,
  steps,
  caption,
}: {
  actors: ActorId[];
  steps: FlowStep[];
  caption?: string;
}) {
  const n = actors.length;
  const idx = (a: ActorId) => actors.indexOf(a);

  return (
    <figure className="m-0">
      {/* ---------- wide screens: the real sequence diagram ---------- */}
      <div
        className="hidden overflow-hidden rounded-lg border sm:block"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
      >
        {/* actor heads */}
        <div
          className="grid gap-0 border-b"
          style={{
            gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
            borderColor: "var(--border)",
            background: "var(--surface-2)",
          }}
        >
          {actors.map((a) => {
            const actor = ACTORS[a];
            return (
              <div key={a} className="px-2 py-2.5 text-center">
                <div
                  className="mx-auto inline-block rounded-md px-2.5 py-1 text-[12.5px] font-bold leading-tight"
                  style={{ background: actor.color, color: "#fff" }}
                >
                  {actor.label}
                </div>
                <div className="mt-1 text-[10.5px] leading-tight" style={{ color: "var(--text-muted)" }}>
                  {actor.sub}
                </div>
              </div>
            );
          })}
        </div>

        {/* messages, over the lifelines */}
        <div className="relative px-1 py-3">
          {/* lifelines */}
          <div
            className="pointer-events-none absolute inset-0 grid px-1"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
            aria-hidden="true"
          >
            {actors.map((a) => (
              <div key={a} className="flex justify-center">
                <div
                  className="h-full w-px"
                  style={{ background: ACTORS[a].color, opacity: 0.32 }}
                />
              </div>
            ))}
          </div>

          <ol className="relative m-0 list-none p-0">
            {steps.map((s, i) => {
              const a = idx(s.from);
              const b = idx(s.to);
              const self = a === b;
              const lo = Math.min(a, b);
              const hi = Math.max(a, b);
              const span = hi - lo + 1;
              const rightwards = b > a;
              const kind = KIND_STYLE[s.kind ?? "info"];
              const color = ACTORS[s.from].color;

              return (
                <li
                  key={i}
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
                >
                  <div
                    className="px-1 pb-4"
                    style={{ gridColumn: `${lo + 1} / ${hi + 2}` }}
                  >
                    <div
                      style={{
                        // land the arrow exactly on the two lifelines it connects
                        paddingLeft: self ? "12%" : `${50 / span}%`,
                        paddingRight: self ? "12%" : `${50 / span}%`,
                      }}
                    >
                      <div
                        className="rounded-md border px-2.5 py-1.5"
                        style={{
                          borderColor: "var(--border)",
                          background: "var(--surface-0)",
                        }}
                      >
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="shrink-0 rounded px-1 text-[10px] font-bold tabular-nums"
                            style={{ background: color, color: "#fff" }}
                          >
                            {i + 1}
                          </span>
                          {s.at ? (
                            <span
                              className="shrink-0 text-[10px] font-semibold tabular-nums"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {s.at}
                            </span>
                          ) : null}
                          <span
                            className="text-[12.5px] leading-snug"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {kind.glyph ? `${kind.glyph} ` : ""}
                            {s.msg}
                          </span>
                        </div>
                        {s.detail ? (
                          <div
                            className="mt-1 text-[11.5px] leading-snug"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {s.detail}
                          </div>
                        ) : null}
                      </div>

                      {/* the arrow itself */}
                      <div className="mt-1 flex items-center" aria-hidden="true">
                        {self ? (
                          <div
                            className="mx-auto text-[11px] font-semibold"
                            style={{ color }}
                          >
                            ↻ {selfLabel(s.from)}
                          </div>
                        ) : (
                          <>
                            {!rightwards && <Head color={color} dir="left" />}
                            <div
                              className="h-0 flex-1"
                              style={{
                                borderTop: `2px ${s.kind === "money" ? "dashed" : "solid"} ${color}`,
                              }}
                            />
                            {rightwards && <Head color={color} dir="right" />}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ---------- phones: the same steps, as a list ---------- */}
      <ol
        className="m-0 list-none space-y-2 rounded-lg border p-2.5 sm:hidden"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
      >
        {steps.map((s, i) => {
          const kind = KIND_STYLE[s.kind ?? "info"];
          return (
            <li key={i} className="flex gap-2">
              <span
                className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded text-center text-[10px] font-bold leading-[18px]"
                style={{ background: ACTORS[s.from].color, color: "#fff" }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: ACTORS[s.from].color }}>{ACTORS[s.from].label}</span>
                  {s.from === s.to ? " — on its own" : " → "}
                  {s.from !== s.to ? (
                    <span style={{ color: ACTORS[s.to].color }}>{ACTORS[s.to].label}</span>
                  ) : null}
                  {s.at ? ` · ${s.at}` : ""}
                </div>
                <div className="text-[12.5px] leading-snug" style={{ color: "var(--text-primary)" }}>
                  {kind.glyph ? `${kind.glyph} ` : ""}
                  {s.msg}
                </div>
                {s.detail ? (
                  <div className="mt-0.5 text-[11.5px] leading-snug" style={{ color: "var(--text-secondary)" }}>
                    {s.detail}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {caption ? (
        <figcaption className="mt-1.5 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** "happens inside you" reads badly; each actor gets a phrase that scans. */
function selfLabel(id: ActorId) {
  switch (id) {
    case "you": return "happens at your depot";
    case "brp": return "happens inside your BRP";
    case "exch": return "happens inside the exchange";
    case "tso": return "happens inside the TSO";
  }
}

function Head({ color, dir }: { color: string; dir: "left" | "right" }) {
  return (
    <span
      className="block h-0 w-0 shrink-0"
      style={{
        borderTop: "5px solid transparent",
        borderBottom: "5px solid transparent",
        [dir === "right" ? "borderLeft" : "borderRight"]: `8px solid ${color}`,
      }}
    />
  );
}

/**
 * The single most important picture in the whole app: you never touch the
 * market. Everything you do reaches it through one company.
 */
export function ActorLegend() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {(["you", "brp", "exch", "tso"] as ActorId[]).map((id) => {
        const a = ACTORS[id];
        return (
          <div
            key={id}
            className="rounded-lg border p-2.5"
            style={{ borderColor: "var(--border)", background: "var(--surface-1)", borderLeft: `4px solid ${a.color}` }}
          >
            <div className="text-[13px] font-bold" style={{ color: a.color }}>
              {a.label}
            </div>
            <div className="text-[10.5px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {a.sub}
            </div>
            <p className="mt-1 text-[12px] leading-snug" style={{ color: "var(--text-secondary)" }}>
              {a.does}
            </p>
          </div>
        );
      })}
    </div>
  );
}
