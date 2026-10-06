import { QUOTES, type Quote } from "@/lib/quotes";
import type { AreaKey } from "@/lib/areas";

/** Chance that the day's quote comes from the user's weakest area, when we know it. */
export const WEAK_AREA_BIAS = 0.7;

/** Small fast string hash (cyrb53, 32-bit part). Stable across runs and devices. */
export function hashString(input: string): number {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return (h1 ^ (h1 >>> 15)) >>> 0;
}

/** Deterministic pseudo-random generator (mulberry32). Each call returns a number in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PickQuoteOptions {
  /** Local calendar day, "yyyy-MM-dd". The same day always gives the same quote. */
  dateKey: string;
  userId: number | string;
  /** The user's weakest area over the previous 7 days, if known. */
  weakestArea?: AreaKey | null;
  /** 0 is the day's quote; the refresh button increments it to walk through the alternatives. */
  offset?: number;
  quotes?: readonly Quote[];
}

export interface PickedQuote {
  quote: Quote;
  /** Set when the quote was chosen because of the user's weakest area. */
  forArea: AreaKey | null;
}

/**
 * The quote for a day. Pure and deterministic: 70% of the time it comes from the weakest area's
 * quotes, otherwise from the whole list. Mixing the user id in keeps two users from always seeing
 * the same quote.
 */
export function pickQuote({ dateKey, userId, weakestArea, offset = 0, quotes = QUOTES }: PickQuoteOptions): PickedQuote {
  const rand = seededRandom(hashString(`${userId}:${dateKey}`));
  const useWeak = rand() < WEAK_AREA_BIAS;
  const pool = weakestArea && useWeak ? quotes.filter((q) => q.areas.includes(weakestArea)) : [];
  const fromArea = pool.length > 0;
  const source = fromArea ? pool : quotes;
  const start = Math.floor(rand() * source.length);
  const quote = source[(start + Math.max(0, offset)) % source.length];
  return { quote, forArea: fromArea ? (weakestArea as AreaKey) : null };
}

/**
 * The user's weakest area, judged on the 7 days *before* today so the answer doesn't change
 * when they check in and the day's quote stays put. Needs `sparkline_30` (30 days, oldest first).
 * Only areas with at least one rating in the window count; returns null when none do.
 */
export function weakestArea(
  areas: Partial<Record<AreaKey, { sparkline_30: (number | null)[] }>> | undefined,
  selected?: AreaKey[]
): AreaKey | null {
  if (!areas) return null;
  let best: { key: AreaKey; avg: number } | null = null;
  for (const [key, stat] of Object.entries(areas) as [AreaKey, { sparkline_30: (number | null)[] }][]) {
    if (selected && !selected.includes(key)) continue;
    const window = stat.sparkline_30.slice(-8, -1).filter((v): v is number => v != null);
    if (window.length === 0) continue;
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    if (!best || avg < best.avg) best = { key, avg };
  }
  return best?.key ?? null;
}
