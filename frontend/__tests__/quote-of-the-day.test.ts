import { describe, expect, it } from "vitest";
import { addDays, format } from "date-fns";
import { QUOTES } from "@/lib/quotes";
import { AREAS, type AreaKey } from "@/lib/areas";
import { hashString, pickQuote, seededRandom, weakestArea, WEAK_AREA_BIAS } from "@/lib/quote-of-the-day";
import { REFLECTION_PROMPTS, pickReflectionPrompt, shouldShowReflection } from "@/lib/reflection-prompts";
import { parseRangeParam, rangeToParam } from "@/lib/range";
import { previousPeriodLabel, summarizeSeries } from "@/lib/chart-summary";

const day = (offset: number) => format(addDays(new Date(2026, 0, 1), offset), "yyyy-MM-dd");

describe("quote list", () => {
  it("has at least five quotes for every area and no duplicates", () => {
    for (const area of AREAS) {
      expect(QUOTES.filter((q) => q.areas.includes(area.key)).length, area.key).toBeGreaterThanOrEqual(5);
    }
    expect(new Set(QUOTES.map((q) => q.text)).size).toBe(QUOTES.length);
  });

  it("attributes every quote", () => {
    for (const q of QUOTES) {
      expect(q.author.length, q.text).toBeGreaterThan(0);
      expect(q.text.length).toBeGreaterThan(10);
    }
  });
});

describe("pickQuote", () => {
  it("is stable: the same day and user always give the same quote", () => {
    const a = pickQuote({ dateKey: "2026-03-04", userId: 7, weakestArea: "mind" });
    for (let i = 0; i < 20; i++) {
      expect(pickQuote({ dateKey: "2026-03-04", userId: 7, weakestArea: "mind" })).toEqual(a);
    }
  });

  it("changes from day to day", () => {
    const seen = new Set(Array.from({ length: 30 }, (_, i) => pickQuote({ dateKey: day(i), userId: 1 }).quote.text));
    expect(seen.size).toBeGreaterThan(15);
  });

  it("differs between users on the same day (not always)", () => {
    const seen = new Set(Array.from({ length: 20 }, (_, u) => pickQuote({ dateKey: "2026-03-04", userId: u }).quote.text));
    expect(seen.size).toBeGreaterThan(5);
  });

  it("draws from the weakest area about 70% of the time, and says so", () => {
    const picks = Array.from({ length: 400 }, (_, i) => pickQuote({ dateKey: day(i), userId: 3, weakestArea: "money" }));
    const fromArea = picks.filter((p) => p.forArea === "money");
    expect(fromArea.length / picks.length).toBeGreaterThan(WEAK_AREA_BIAS - 0.1);
    expect(fromArea.length / picks.length).toBeLessThan(WEAK_AREA_BIAS + 0.1);
    for (const p of fromArea) expect(p.quote.areas).toContain("money");
  });

  it("never claims an area when none is given", () => {
    for (let i = 0; i < 50; i++) expect(pickQuote({ dateKey: day(i), userId: 3 }).forArea).toBeNull();
  });

  it("offset walks through the alternatives without repeating immediately", () => {
    const base = { dateKey: "2026-03-04", userId: 7, weakestArea: "work" as AreaKey };
    const texts = [0, 1, 2, 3].map((offset) => pickQuote({ ...base, offset }).quote.text);
    expect(new Set(texts).size).toBe(4);
    expect(pickQuote({ ...base, offset: 0 }).quote.text).toBe(texts[0]);
  });

  it("falls back to all quotes if the area has none", () => {
    const only = [{ text: "Only one", author: "Me", areas: ["health"] as AreaKey[] }];
    expect(pickQuote({ dateKey: "x", userId: 1, weakestArea: "money", quotes: only }).quote.text).toBe("Only one");
  });
});

describe("hash and random helpers", () => {
  it("are deterministic and spread out", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
    const r1 = seededRandom(42);
    const r2 = seededRandom(42);
    const seq = [r1(), r1(), r1()];
    expect(seq).toEqual([r2(), r2(), r2()]);
    for (const n of seq) expect(n).toBeGreaterThanOrEqual(0), expect(n).toBeLessThan(1);
  });
});

describe("weakestArea", () => {
  const stat = (...vals: (number | null)[]) => ({ sparkline_30: [...Array(30 - vals.length).fill(null), ...vals] });

  it("picks the lowest average over the 7 days before today", () => {
    const areas = {
      health: stat(8, 8, 8, 8, 8, 8, 8, 8),
      mind: stat(5, 5, 5, 5, 5, 5, 5, 5),
      work: stat(9, 9, 9, 9, 9, 9, 9, 9),
    };
    expect(weakestArea(areas)).toBe("mind");
  });

  it("ignores today, so checking in doesn't change the day's quote", () => {
    // Today's last value is very low for health, but the 7 days before it are higher than mind's.
    const areas = { health: stat(8, 8, 8, 8, 8, 8, 8, 1), mind: stat(5, 5, 5, 5, 5, 5, 5, 9) };
    expect(weakestArea(areas)).toBe("mind");
  });

  it("skips areas with no ratings in the window, and respects the selected areas", () => {
    const areas = { health: stat(), mind: stat(6, 6, 6, 6, 6, 6, 6, 6), work: stat(3, 3, 3, 3, 3, 3, 3, 3) };
    expect(weakestArea(areas)).toBe("work");
    expect(weakestArea(areas, ["mind", "health"])).toBe("mind");
  });

  it("is null without data", () => {
    expect(weakestArea(undefined)).toBeNull();
    expect(weakestArea({ health: stat() })).toBeNull();
  });
});

describe("reflection", () => {
  it("picks one stable prompt per day from the list", () => {
    const p = pickReflectionPrompt("2026-03-04", 9);
    expect(REFLECTION_PROMPTS).toContain(p);
    expect(pickReflectionPrompt("2026-03-04", 9)).toBe(p);
    expect(new Set(Array.from({ length: 30 }, (_, i) => pickReflectionPrompt(day(i), 9))).size).toBeGreaterThan(5);
  });

  it("shows only after 6 pm and once the check-in is done", () => {
    const at = (h: number) => new Date(2026, 2, 4, h, 0);
    expect(shouldShowReflection(at(17), true)).toBe(false);
    expect(shouldShowReflection(at(18), true)).toBe(true);
    expect(shouldShowReflection(at(22), false)).toBe(false);
  });
});

describe("range URL param", () => {
  it("round-trips the four ranges and defaults unknown values to 30", () => {
    for (const d of [7, 30, 90, 365] as const) expect(parseRangeParam(rangeToParam(d))).toBe(d);
    expect(rangeToParam(365)).toBe("1y");
    expect(parseRangeParam(null)).toBe(30);
    expect(parseRangeParam("banana")).toBe(30);
    expect(parseRangeParam("90D")).toBe(90);
  });
});

describe("chart summaries", () => {
  it("describes a series from first to last value, skipping gaps", () => {
    expect(summarizeSeries("Life score", 30, [null, 6.8, null, 7, 7.4, null])).toBe("Life score, last 30 days, from 6.8 to 7.4");
    expect(summarizeSeries("Mood", 7, [4, 4])).toBe("Mood, last 7 days, from 4 to 4");
    expect(summarizeSeries("Life score", 365, [5])).toBe("Life score, last year, one value: 5");
  });

  it("says when there is no data", () => {
    expect(summarizeSeries("Life score", 90, [null, null])).toBe("Life score, last 90 days, no data");
    expect(summarizeSeries("Life score", 90, [])).toBe("Life score, last 90 days, no data");
  });

  it("labels the comparison period", () => {
    expect(previousPeriodLabel(7)).toBe("vs previous 7 days");
    expect(previousPeriodLabel(365)).toBe("vs previous year");
  });
});

import { ANALYSIS_WAIT_MS, isAnalysisPending } from "@/lib/checkin-utils";

describe("isAnalysisPending", () => {
  const now = Date.parse("2026-03-04T12:00:00Z");
  const done = (msAgo: number) => new Date(now - msAgo).toISOString();

  it("is pending shortly after completing without an analysis", () => {
    expect(isAnalysisPending({ is_complete: true, ai_analysis: null, completed_at: done(10_000) }, now)).toBe(true);
    expect(isAnalysisPending({ is_complete: true, ai_analysis: null }, now)).toBe(true);
  });

  it("gives up after the wait window so a failed analysis doesn't spin forever", () => {
    expect(isAnalysisPending({ is_complete: true, ai_analysis: null, completed_at: done(ANALYSIS_WAIT_MS + 1) }, now)).toBe(false);
  });

  it("is not pending when incomplete, missing, or already analysed", () => {
    expect(isAnalysisPending({ is_complete: false }, now)).toBe(false);
    expect(isAnalysisPending(undefined, now)).toBe(false);
    expect(isAnalysisPending({ is_complete: true, ai_analysis: { summary: "x" }, completed_at: done(1000) }, now)).toBe(false);
  });
});
