"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { journalsApi, type ListJournalsParams, type CreateJournalData, type UpdateJournalData } from "@/lib/api/journals";

export function useJournalList(params?: ListJournalsParams) {
  return useQuery({
    queryKey: ["journals", "list", params],
    queryFn: () => journalsApi.list(params),
    staleTime: 30_000,
  });
}

export function useJournal(id: number | null) {
  return useQuery({
    queryKey: ["journals", id],
    queryFn: () => journalsApi.get(id!),
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useJournalMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["journals"] });

  const createMutation = useMutation({
    mutationFn: (data: CreateJournalData) => journalsApi.create(data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateJournalData }) =>
      journalsApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => journalsApi.delete(id),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation, deleteMutation };
}
