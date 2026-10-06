/** Ranges the chart endpoints accept (`days` query parameter). */
export const RANGE_DAYS = [7, 30, 90, 365] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];
export const DEFAULT_RANGE: RangeDays = 30;

const URL_FORM: Record<RangeDays, string> = { 7: "7d", 30: "30d", 90: "90d", 365: "1y" };

/** `?range=30d` form of a range. */
export function rangeToParam(range: RangeDays): string {
  return URL_FORM[range];
}

/** Parse a `range` query parameter; anything unknown falls back to the default. */
export function parseRangeParam(value: string | null | undefined): RangeDays {
  const hit = RANGE_DAYS.find((d) => URL_FORM[d] === value?.toLowerCase());
  return hit ?? DEFAULT_RANGE;
}
