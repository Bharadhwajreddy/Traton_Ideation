export const eur = (v: number, dp = 0) =>
  `${v < 0 ? "−" : ""}€${Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

export const eurSigned = (v: number, dp = 0) =>
  `${v < 0 ? "−" : "+"}€${Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

export const num = (v: number, dp = 2) =>
  v.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });

/** Quarter-hour index -> clock time, e.g. 54 -> "13:30". */
export function qhToTime(qh: number): string {
  const minutes = qh * 15;
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function qhToHourLabel(qh: number): string {
  return qh % 4 === 0 ? qhToTime(qh) : "";
}
