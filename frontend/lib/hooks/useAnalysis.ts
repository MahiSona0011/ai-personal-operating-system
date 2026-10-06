"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analysisApi } from "@/lib/api/analysis";
import type { AreaSummary } from "@/lib/api/areas";
import { toastError, toastUndo } from "@/lib/toast";
import type { AIRecommendation } from "@/types";

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["analysis"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }); // latest insight
    queryClient.invalidateQueries({ queryKey: ["areas"] }); // area recommendations
  };

  const onDemandMutation = useMutation({
    mutationFn: analysisApi.onDemand,
    onSuccess: invalidate,
    meta: { errorMessage: "Couldn't get an answer right now" },
  });

  // Dismissing removes the insight from every list at once, rolls back on failure, and offers Undo.
  const dismissMutation = useMutation({
    mutationFn: (id: number) => analysisApi.updateRecommendation(id, { is_dismissed: true }),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["analysis", "recommendations"] });
      const lists = queryClient.getQueriesData<AIRecommendation[]>({ queryKey: ["analysis", "recommendations"] });
      const areas = queryClient.getQueriesData<AreaSummary>({ queryKey: ["areas"] });
      queryClient.setQueriesData<AIRecommendation[]>({ queryKey: ["analysis", "recommendations"] }, (old) =>
        old?.filter((r) => r.id !== id)
      );
      queryClient.setQueriesData<AreaSummary>({ queryKey: ["areas"] }, (old) =>
        old ? { ...old, recommendations: old.recommendations.filter((r) => r.id !== id) } : old
      );
      return { lists, areas };
    },
    onError: (_err, _id, ctx) => {
      ctx?.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      ctx?.areas.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (_data, id) => {
      toastUndo("Insight dismissed", async () => {
        try {
          await analysisApi.updateRecommendation(id, { is_dismissed: false });
        } catch (err) {
          toastError(err, "Couldn't restore the insight");
        } finally {
          invalidate();
        }
      });
    },
    onSettled: invalidate,
    meta: { errorMessage: "Couldn't dismiss the insight" },
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, rating }: { id: number; rating: number }) =>
      analysisApi.updateRecommendation(id, { user_rating: rating }),
    onSuccess: invalidate,
    meta: { errorMessage: "Couldn't save your rating" },
  });

  const retriggerMutation = useMutation({
    mutationFn: analysisApi.retriggerCheckin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      queryClient.invalidateQueries({ queryKey: ["analysis"] });
    },
    meta: { successMessage: "Re-running the analysis", errorMessage: "Couldn't re-run the analysis" },
  });

  const generateWeeklyMutation = useMutation({
    mutationFn: analysisApi.generateWeekly,
    onSuccess: invalidate,
    meta: { successMessage: "Generating your weekly review", errorMessage: "Couldn't generate the review" },
  });

  return {
    onDemandMutation,
    dismissMutation,
    rateMutation,
    retriggerMutation,
    generateWeeklyMutation,
  };
}
