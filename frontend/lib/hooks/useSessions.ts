"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionsApi } from "@/lib/api/sessions";

export function useSessionsList(params?: { life_area_id?: number; limit?: number }) {
  return useQuery({
    queryKey: ["sessions", "list", params],
    queryFn: () => sessionsApi.list(params),
    staleTime: 60_000,
  });
}

export function useSessionStats(days = 84) {
  return useQuery({
    queryKey: ["sessions", "stats", days],
    queryFn: () => sessionsApi.stats(days),
    staleTime: 5 * 60_000,
  });
}

export function useSessionMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: sessionsApi.create,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof sessionsApi.update>[1] }) =>
      sessionsApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: sessionsApi.delete,
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation, deleteMutation };
}
