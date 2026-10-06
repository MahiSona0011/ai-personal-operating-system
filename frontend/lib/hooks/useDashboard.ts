"use client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { habitsApi } from "@/lib/api/habits";
import { checkinsApi } from "@/lib/api/checkins";
import { areasApi } from "@/lib/api/areas";
import { metricsApi, type MetricSeriesParams } from "@/lib/api/metrics";
import { DEFAULT_RANGE, type RangeDays } from "@/lib/range";
import { isAnalysisPending } from "@/lib/checkin-utils";

// Query keys all end with the range so each range is cached on its own. `keepPreviousData` keeps
// the old chart on screen while a new range loads, so switching ranges doesn't flash a skeleton.
// Mutations invalidate these by prefix through `invalidateInsights` (lib/hooks/invalidate.ts).

export function useDashboard(range: RangeDays = DEFAULT_RANGE) {
  return useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => dashboardApi.get(range),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useHabitsToday() {
  return useQuery({
    queryKey: ["habits", "today"],
    queryFn: habitsApi.today,
    staleTime: 60_000,
  });
}

export function useCheckinToday() {
  return useQuery({
    queryKey: ["checkin", "today"],
    queryFn: checkinsApi.today,
    staleTime: 30_000,
    refetchInterval: (query) => {
      return isAnalysisPending(query.state.data) ? 10_000 : false;
    },
  });
}

/** Life Score, mood, energy and per-area scores per day, with a 7-day moving average. */
export function useLifeScoreTrend(range: RangeDays = DEFAULT_RANGE) {
  return useQuery({
    queryKey: ["checkin", "trend", range],
    queryFn: () => checkinsApi.trend(range),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

/** Everything an area page needs, in one request. */
export function useAreaSummary(areaId: number, range: RangeDays = DEFAULT_RANGE) {
  return useQuery({
    queryKey: ["areas", areaId, "summary", range],
    queryFn: () => areasApi.summary(areaId, range),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/** Daily habit completion rate plus each habit's 30-day rate. */
export function useHabitCompletion(range: RangeDays = DEFAULT_RANGE) {
  return useQuery({
    queryKey: ["habits", "completion", range],
    queryFn: () => habitsApi.completion(range),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/** One metric over time, averaged per day. */
export function useMetricSeries({ key, area_id, days = DEFAULT_RANGE }: MetricSeriesParams, enabled = true) {
  return useQuery({
    queryKey: ["metrics", "series", key, area_id ?? null, days],
    queryFn: () => metricsApi.series({ key, area_id, days }),
    enabled: enabled && !!key,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
