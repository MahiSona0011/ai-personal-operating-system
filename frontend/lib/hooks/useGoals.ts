"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi } from "@/lib/api/goals";
import { invalidateInsights } from "./invalidate";
import { toastUndo } from "@/lib/toast";
import type { Goal } from "@/types";

export function useGoalsList() {
  return useQuery({
    queryKey: ["goals", "list"],
    queryFn: goalsApi.list,
    staleTime: 60_000,
  });
}

export function useGoalMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    invalidateInsights(queryClient);
  };

  const createMutation = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: invalidate,
    meta: { successMessage: "Goal created", errorMessage: "Couldn't create the goal" },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof goalsApi.update>[1] }) =>
      goalsApi.update(id, data),
    onSuccess: invalidate,
    meta: { successMessage: "Goal updated", errorMessage: "Couldn't update the goal" },
  });

  const deleteMutation = useMutation({
    mutationFn: goalsApi.delete,
    onSuccess: invalidate,
    meta: { successMessage: "Goal deleted", errorMessage: "Couldn't delete the goal" },
  });

  const completeMutation = useMutation({
    mutationFn: goalsApi.complete,
    onSuccess: invalidate,
    meta: { successMessage: "Goal completed. Nice work!", errorMessage: "Couldn't complete the goal" },
  });

  const addMilestoneMutation = useMutation({
    mutationFn: ({ goalId, data }: { goalId: number; data: Parameters<typeof goalsApi.addMilestone>[1] }) =>
      goalsApi.addMilestone(goalId, data),
    onSuccess: invalidate,
    meta: { successMessage: "Milestone added", errorMessage: "Couldn't add the milestone" },
  });

  // Ticking a milestone updates the card at once, rolls back (with an error toast) if the API
  // fails, and offers Undo, which un-ticks it the same way.
  const listKey = ["goals", "list"] as const;
  const setMilestone = (goalId: number, milestoneId: number, done: boolean) =>
    queryClient.setQueryData<Goal[]>(listKey, (old) =>
      old?.map((g) => {
        if (g.id !== goalId) return g;
        const milestones = g.milestones.map((m) => (m.id === milestoneId ? { ...m, is_completed: done } : m));
        const progress = milestones.length
          ? Math.round((milestones.filter((m) => m.is_completed).length / milestones.length) * 10000) / 100
          : g.progress_pct;
        return { ...g, milestones, progress_pct: progress };
      })
    );

  const milestoneMutation = useMutation({
    mutationFn: ({ goalId, milestoneId, done }: { goalId: number; milestoneId: number; done: boolean }) =>
      done ? goalsApi.completeMilestone(goalId, milestoneId) : goalsApi.uncompleteMilestone(goalId, milestoneId),
    onMutate: async ({ goalId, milestoneId, done }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Goal[]>(listKey);
      setMilestone(goalId, milestoneId, done);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(listKey, ctx.previous);
    },
    onSettled: invalidate,
    meta: { errorMessage: "Couldn't update the milestone" },
  });

  const completeMilestoneMutation = {
    ...milestoneMutation,
    /** Tick a milestone and offer Undo. */
    mutate: async ({ goalId, milestoneId, title }: { goalId: number; milestoneId: number; title?: string }) => {
      try {
        await milestoneMutation.mutateAsync({ goalId, milestoneId, done: true });
      } catch {
        return; // rolled back; the global handler showed the error
      }
      toastUndo(title ? `Milestone done: ${title}` : "Milestone done", () => {
        milestoneMutation.mutate({ goalId, milestoneId, done: false });
      });
    },
  };

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    completeMutation,
    addMilestoneMutation,
    completeMilestoneMutation,
  };
}
