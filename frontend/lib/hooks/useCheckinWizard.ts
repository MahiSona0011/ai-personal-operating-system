"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checkinsApi } from "@/lib/api/checkins";
import { invalidateInsights } from "./invalidate";
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
    meta: { errorMessage: "Couldn't save your check-in" },
  });

  const completeMutation = useMutation({
    mutationFn: () => checkinsApi.complete(checkin!.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["checkin", "today"], updated);
      invalidateInsights(queryClient);
    },
    meta: { errorMessage: "Couldn't complete your check-in" },
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
