"use client";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { habitsApi } from "@/lib/api/habits";
import { checkinsApi } from "@/lib/api/checkins";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
    staleTime: 30_000,
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
      const data = query.state.data;
      if (data?.is_complete && !data?.ai_analysis) return 10_000;
      return false;
    },
  });
}

export function useCheckinTrend(days = 30) {
  return useQuery({
    queryKey: ["checkin", "trend", days],
    queryFn: () => checkinsApi.trend(days),
    staleTime: 5 * 60_000,
  });
}
