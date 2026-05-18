"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analysisApi } from "@/lib/api/analysis";

export function useRecommendations(params?: { type?: string; limit?: number }) {
  return useQuery({
    queryKey: ["analysis", "recommendations", params],
    queryFn: () => analysisApi.recommendations(params),
    staleTime: 60_000,
  });
}

export function useWeeklyReviews() {
  return useQuery({
    queryKey: ["analysis", "weekly-reviews"],
    queryFn: () => analysisApi.weeklyReviews(),
    staleTime: 5 * 60_000,
    refetchInterval: (query) => {
      const reviews = query.state.data as import("@/types").WeeklyReview[] | undefined;
      if (!reviews) return false;
      const hasPending = reviews.some(
        (r) => r.generation_status === "pending" || r.generation_status === "in_progress"
      );
      return hasPending ? 3000 : false;
    },
  });
}

export function useAnalysisMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["analysis"] });

  const onDemandMutation = useMutation({
    mutationFn: analysisApi.onDemand,
    onSuccess: invalidate,
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => analysisApi.updateRecommendation(id, { is_dismissed: true }),
    onSuccess: invalidate,
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, rating }: { id: number; rating: number }) =>
      analysisApi.updateRecommendation(id, { user_rating: rating }),
    onSuccess: invalidate,
  });

  const retriggerMutation = useMutation({
    mutationFn: analysisApi.retriggerCheckin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      queryClient.invalidateQueries({ queryKey: ["analysis"] });
    },
  });

  const generateWeeklyMutation = useMutation({
    mutationFn: analysisApi.generateWeekly,
    onSuccess: invalidate,
  });

  return {
    onDemandMutation,
    dismissMutation,
    rateMutation,
    retriggerMutation,
    generateWeeklyMutation,
  };
}
