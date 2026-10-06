/** Narrow an `unknown` value (e.g. from an AI raw_response blob) to a non-empty string. */
export function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}
