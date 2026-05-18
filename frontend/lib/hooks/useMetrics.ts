"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { metricsApi, type ListMetricsParams, type CreateMetricData, type UpdateMetricData } from "@/lib/api/metrics";

export function useMetricList(params?: ListMetricsParams) {
  return useQuery({
    queryKey: ["metrics", "list", params],
    queryFn: () => metricsApi.list(params),
    staleTime: 30_000,
  });
}

export function useMetricHistory(life_area_id: number | null, metric_key: string | null) {
  return useQuery({
    queryKey: ["metrics", "history", life_area_id, metric_key],
    queryFn: () =>
      metricsApi.list({ life_area_id: life_area_id!, metric_key: metric_key!, limit: 90 }),
    enabled: life_area_id !== null && metric_key !== null,
    staleTime: 30_000,
  });
}

export function useMetricMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["metrics"] });

  const createMutation = useMutation({
    mutationFn: (data: CreateMetricData) => metricsApi.create(data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMetricData }) =>
      metricsApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => metricsApi.delete(id),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation, deleteMutation };
}
