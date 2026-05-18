"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi } from "@/lib/api/goals";
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
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof goalsApi.update>[1] }) =>
      goalsApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: goalsApi.delete,
    onSuccess: invalidate,
  });

  const completeMutation = useMutation({
    mutationFn: goalsApi.complete,
    onSuccess: invalidate,
  });

  const addMilestoneMutation = useMutation({
    mutationFn: ({ goalId, data }: { goalId: number; data: Parameters<typeof goalsApi.addMilestone>[1] }) =>
      goalsApi.addMilestone(goalId, data),
    onSuccess: invalidate,
  });

  const completeMilestoneMutation = useMutation({
    mutationFn: ({ goalId, milestoneId }: { goalId: number; milestoneId: number }) =>
      goalsApi.completeMilestone(goalId, milestoneId),
    onSuccess: invalidate,
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    completeMutation,
    addMilestoneMutation,
    completeMilestoneMutation,
  };
}
