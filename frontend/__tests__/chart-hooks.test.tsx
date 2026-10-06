import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const get = vi.fn();
vi.mock("@/lib/api/client", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import {
  useAreaSummary,
  useDashboard,
  useHabitCompletion,
  useLifeScoreTrend,
  useMetricSeries,
} from "@/lib/hooks/useDashboard";
import { invalidateInsights } from "@/lib/hooks/invalidate";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: { ok: true } });
});

describe("chart data hooks", () => {
  it("useLifeScoreTrend requests the range and caches each range separately", async () => {
    const { client, wrapper } = setup();
    const { result, rerender } = renderHook(({ range }) => useLifeScoreTrend(range), {
      wrapper,
      initialProps: { range: 30 as 7 | 30 | 90 | 365 },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith("/checkins/trend", { params: { days: 30 } });

    rerender({ range: 90 });
    await waitFor(() => expect(get).toHaveBeenCalledWith("/checkins/trend", { params: { days: 90 } }));
    expect(client.getQueryCache().findAll({ queryKey: ["checkin", "trend"] }).map((q) => q.queryKey[2]).sort()).toEqual([30, 90]);
  });

  it("useDashboard defaults to 30 days", async () => {
    const { wrapper } = setup();
    renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledWith("/dashboard", { params: { days: 30 } }));
  });

  it("useAreaSummary hits the area's summary endpoint", async () => {
    const { client, wrapper } = setup();
    renderHook(() => useAreaSummary(4, 7), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledWith("/areas/4/summary", { params: { days: 7 } }));
    expect(client.getQueryCache().find({ queryKey: ["areas", 4, "summary", 7] })).toBeDefined();
  });

  it("useHabitCompletion hits /habits/completion", async () => {
    const { wrapper } = setup();
    renderHook(() => useHabitCompletion(365), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledWith("/habits/completion", { params: { days: 365 } }));
  });

  it("useMetricSeries sends the key, area and range, and stays idle without a key", async () => {
    const { client, wrapper } = setup();
    renderHook(() => useMetricSeries({ key: "sleep_hours", area_id: 1, days: 90 }), { wrapper });
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/metrics/series", { params: { key: "sleep_hours", area_id: 1, days: 90 } })
    );
    expect(client.getQueryCache().find({ queryKey: ["metrics", "series", "sleep_hours", 1, 90] })).toBeDefined();

    get.mockClear();
    renderHook(() => useMetricSeries({ key: "" }), { wrapper });
    await new Promise((r) => setTimeout(r, 20));
    expect(get).not.toHaveBeenCalled();
  });
});

describe("invalidateInsights", () => {
  it("marks the dashboard, area pages and trend stale for every range", async () => {
    const { client } = setup();
    for (const key of [
      ["dashboard", 30],
      ["dashboard", 7],
      ["areas", 1, "summary", 30],
      ["checkin", "trend", 90],
    ]) {
      client.setQueryData(key, { ok: true });
    }
    client.setQueryData(["checkin", "today"], { id: 1 });
    invalidateInsights(client);
    const stale = (key: unknown[]) => client.getQueryState(key)!.isInvalidated;
    expect(stale(["dashboard", 30])).toBe(true);
    expect(stale(["dashboard", 7])).toBe(true);
    expect(stale(["areas", 1, "summary", 30])).toBe(true);
    expect(stale(["checkin", "trend", 90])).toBe(true);
    expect(stale(["checkin", "today"])).toBe(false);
  });
});
