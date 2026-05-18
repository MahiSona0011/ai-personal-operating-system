"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checkinsApi } from "@/lib/api/checkins";
import type { Checkin } from "@/types";

export function useCheckinWizard() {
  const queryClient = useQueryClient();

  const { data: checkin, isLoading } = useQuery({
    queryKey: ["checkin", "today"],
    queryFn: checkinsApi.today,
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Checkin>) => checkinsApi.update(checkin!.id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["checkin", "today"], updated);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => checkinsApi.complete(checkin!.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["checkin", "today"], updated);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return {
    checkin,
    isLoading,
    update: updateMutation.mutateAsync,
    complete: completeMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isCompleting: completeMutation.isPending,
    updateError: updateMutation.error,
    completeError: completeMutation.error,
  };
}
