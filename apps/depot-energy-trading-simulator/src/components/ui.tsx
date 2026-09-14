"use client";

import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card min-w-0 p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h3 className="text-[15px] font-semibold leading-tight">{title}</h3>}
            {subtitle && (
              <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const color =
    tone === "good"
      ? "var(--good)"
      : tone === "bad"
        ? "var(--critical)"
        : tone === "warn"
          ? "var(--serious)"
          : "var(--text-primary)";
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="tnum mt-0.5 text-[19px] font-semibold leading-tight" style={{ color }}>
        {value}
      </div>
      {detail && (
        <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--text-secondary)" }}>
          {detail}
        </div>
      )}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
        <span className="tnum text-[12.5px] font-semibold">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && (
        <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          className="w-[92px] text-right"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && (
          <span className="w-[52px] text-[11.5px]" style={{ color: "var(--text-muted)" }}>
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--series-1)]"
      />
      <span>
        <span className="text-[13px] font-medium">{label}</span>
        {hint && (
          <span className="block text-[11.5px]" style={{ color: "var(--text-secondary)" }}>
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn" | "info";
}) {
  const map = {
    neutral: ["var(--surface-2)", "var(--text-secondary)"],
    good: ["color-mix(in srgb, var(--good) 14%, transparent)", "var(--good)"],
    bad: ["color-mix(in srgb, var(--critical) 14%, transparent)", "var(--critical)"],
    warn: ["color-mix(in srgb, var(--serious) 18%, transparent)", "var(--serious)"],
    info: ["var(--accent-soft)", "var(--series-1)"],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

export function Note({
  kind = "info",
  title,
  children,
}: {
  kind?: "info" | "legal" | "warn";
  title: string;
  children: ReactNode;
}) {
  const accent =
    kind === "warn" ? "var(--serious)" : kind === "legal" ? "var(--series-3)" : "var(--series-1)";
  return (
    <aside
      className="rounded-r-lg px-3.5 py-2.5 text-[12.5px]"
      style={{ borderLeft: `3px solid ${accent}`, background: "var(--surface-2)" }}
    >
      <strong className="block text-[12px] font-semibold" style={{ color: accent }}>
        {title}
      </strong>
      <div className="mt-1" style={{ color: "var(--text-secondary)" }}>
        {children}
      </div>
    </aside>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-lg p-1"
      style={{ background: "var(--surface-2)" }}
      role="group"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.hint}
            className="rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors"
            style={{
              background: active ? "var(--surface-1)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,.08)" : "none",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-opacity disabled:opacity-40"
      style={
        variant === "primary"
          ? { background: "var(--series-1)", color: "#fff" }
          : {
              background: "var(--surface-2)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }
      }
    >
      {children}
    </button>
  );
}
