"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { habitsApi } from "@/lib/api/habits";
import { toastUndo } from "@/lib/toast";
import { invalidateInsights } from "./invalidate";
import type { Habit, HabitWithStatus } from "@/types";

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

const todayKey = () => format(new Date(), "yyyy-MM-dd");

/**
 * One-tap habit logging for "today": the list updates immediately, a failure rolls it back and
 * shows an error toast, and a success shows an Undo toast that removes the log again.
 */
export function useLogHabitToday() {
  const queryClient = useQueryClient();
  const listKey = ["habits", "today"] as const;

  const setCompleted = (id: number, completed: boolean) =>
    queryClient.setQueryData<HabitWithStatus[]>(listKey, (old) =>
      old?.map((h) =>
        h.id === id
          ? { ...h, completed_today: completed, completion_count_today: completed ? 1 : 0 }
          : h
      )
    );

  const settle = () => {
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    invalidateInsights(queryClient);
  };

  const mutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      completed ? habitsApi.log(id, { log_date: todayKey() }) : habitsApi.unlog(id, todayKey()),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<HabitWithStatus[]>(listKey);
      setCompleted(id, completed);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      // The global mutation cache shows the error toast; here we only roll the list back.
      if (ctx?.previous) queryClient.setQueryData(listKey, ctx.previous);
    },
    onSettled: settle,
    meta: { errorMessage: "Couldn't update that habit" },
  });

  return {
    isPending: mutation.isPending,
    /** Mark done and offer Undo. */
    log: async (habit: { id: number; title: string }) => {
      try {
        await mutation.mutateAsync({ id: habit.id, completed: true });
      } catch {
        return; // onError already rolled back and showed the error toast
      }
      toastUndo(`Logged “${habit.title}”`, () => mutation.mutate({ id: habit.id, completed: false }));
    },
  };
}

export function useHabitMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    invalidateInsights(queryClient);
  };

  const createMutation = useMutation({
    mutationFn: habitsApi.create,
    onSuccess: invalidate,
    meta: { successMessage: "Habit created", errorMessage: "Couldn't create the habit" },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Habit> }) =>
      habitsApi.update(id, data),
    onSuccess: invalidate,
    meta: { successMessage: "Habit updated", errorMessage: "Couldn't update the habit" },
  });

  const deleteMutation = useMutation({
    mutationFn: habitsApi.delete,
    onSuccess: invalidate,
    meta: { successMessage: "Habit deleted", errorMessage: "Couldn't delete the habit" },
  });

  const logMutation = useMutation({
    mutationFn: ({ id, log_date }: { id: number; log_date: string }) =>
      habitsApi.log(id, { log_date }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits", "logs", id] });
      invalidateInsights(queryClient);
    },
    meta: { errorMessage: "Couldn't log the habit" },
  });

  return { createMutation, updateMutation, deleteMutation, logMutation };
}
