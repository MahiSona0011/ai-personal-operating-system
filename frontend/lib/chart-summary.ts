export const RANGE_LABEL: Record<number, string> = {
  7: "last 7 days",
  30: "last 30 days",
  90: "last 90 days",
  365: "last year",
};

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * A one-sentence description of a series for an `aria-label`, e.g.
 * "Life score, last 30 days, from 6.8 to 7.4". Gaps (null) are skipped; with no data it says so.
 */
export function summarizeSeries(label: string, days: number, values: (number | null | undefined)[]): string {
  const range = RANGE_LABEL[days] ?? `last ${days} days`;
  const present = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (present.length === 0) return `${label}, ${range}, no data`;
  if (present.length === 1) return `${label}, ${range}, one value: ${fmt(present[0])}`;
  return `${label}, ${range}, from ${fmt(present[0])} to ${fmt(present[present.length - 1])}`;
}

/** "vs previous 7 days", "vs previous year". */
export function previousPeriodLabel(days: number): string {
  return days === 365 ? "vs previous year" : `vs previous ${days} days`;
}
