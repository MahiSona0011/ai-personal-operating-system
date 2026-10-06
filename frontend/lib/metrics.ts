/** Metrics where a lower number is the better direction, so a drop is coloured as an improvement. */
export const LOWER_IS_BETTER: ReadonlySet<string> = new Set([
  "stress_level",
  "heart_rate",
  "distractions",
  "meetings",
  "expenses",
]);

/** Compact number for a tile: 12400 -> "12,400", 7.5 -> "7.5", 7.0 -> "7". */
export function formatMetricValue(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}
