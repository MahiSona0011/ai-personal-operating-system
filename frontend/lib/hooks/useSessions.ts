"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionsApi } from "@/lib/api/sessions";
import { invalidateInsights } from "./invalidate";

export function useSessionsList(params?: { life_area_id?: number; limit?: number }) {
  return useQuery({
    queryKey: ["sessions", "list", params],
    queryFn: () => sessionsApi.list(params),
    staleTime: 60_000,
  });
}

export function useSessionStats(days = 84, filters?: { session_type?: string; life_area_id?: number }) {
  return useQuery({
    queryKey: ["sessions", "stats", days, filters ?? null],
    queryFn: () => sessionsApi.stats(days, filters),
    staleTime: 5 * 60_000,
  });
}

export function useSessionMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    invalidateInsights(queryClient);
  };

  const createMutation = useMutation({
    mutationFn: sessionsApi.create,
    onSuccess: invalidate,
    meta: { successMessage: "Session logged", errorMessage: "Couldn't log the session" },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof sessionsApi.update>[1] }) =>
      sessionsApi.update(id, data),
    onSuccess: invalidate,
    meta: { successMessage: "Session updated", errorMessage: "Couldn't update the session" },
  });

  const deleteMutation = useMutation({
    mutationFn: sessionsApi.delete,
    onSuccess: invalidate,
    meta: { successMessage: "Session deleted", errorMessage: "Couldn't delete the session" },
  });

  return { createMutation, updateMutation, deleteMutation };
}
