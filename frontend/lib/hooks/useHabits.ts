"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { habitsApi } from "@/lib/api/habits";
import type { Habit } from "@/types";

export function useHabitsList() {
  return useQuery({
    queryKey: ["habits", "list"],
    queryFn: habitsApi.list,
    staleTime: 60_000,
  });
}

export function useHabitLogs(habitId: number) {
  return useQuery({
    queryKey: ["habits", "logs", habitId],
    queryFn: () => habitsApi.logs(habitId),
    staleTime: 5 * 60_000,
  });
}

export function useHabitMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: habitsApi.create,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Habit> }) =>
      habitsApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: habitsApi.delete,
    onSuccess: invalidate,
  });

  const logMutation = useMutation({
    mutationFn: ({ id, log_date }: { id: number; log_date: string }) =>
      habitsApi.log(id, { log_date }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits", "logs", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return { createMutation, updateMutation, deleteMutation, logMutation };
}
