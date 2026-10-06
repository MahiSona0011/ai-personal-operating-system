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

export function useMetricMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["metrics"] });
    queryClient.invalidateQueries({ queryKey: ["areas"] }); // area pages list each metric's latest value
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateMetricData) => metricsApi.create(data),
    onSuccess: invalidate,
    meta: { successMessage: "Reading logged", errorMessage: "Couldn't log the reading" },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMetricData }) =>
      metricsApi.update(id, data),
    onSuccess: invalidate,
    meta: { successMessage: "Reading updated", errorMessage: "Couldn't update the reading" },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => metricsApi.delete(id),
    onSuccess: invalidate,
    meta: { successMessage: "Reading deleted", errorMessage: "Couldn't delete the reading" },
  });

  return { createMutation, updateMutation, deleteMutation };
}
