"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { journalsApi, type ListJournalsParams, type CreateJournalData, type UpdateJournalData } from "@/lib/api/journals";
import type { JournalEntry } from "@/types";

const ANALYSIS_POLL_MS = 4_000;
const ANALYSIS_GIVE_UP_MS = 2 * 60_000; // an entry still "pending" after this was lost with its worker

/** True while the AI summary for this entry is expected to arrive soon. */
export function isAnalysing(entry: JournalEntry, now = Date.now()): boolean {
  return entry.ai_status === "pending" && now - Date.parse(entry.updated_at) < ANALYSIS_GIVE_UP_MS;
}

export function useJournalList(params?: ListJournalsParams) {
  return useQuery({
    queryKey: ["journals", "list", params],
    queryFn: () => journalsApi.list(params),
    staleTime: 30_000,
    // Pick up AI summaries as they land, then stop polling.
    refetchInterval: (query) => (query.state.data?.some((e) => isAnalysing(e)) ? ANALYSIS_POLL_MS : false),
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
    meta: { successMessage: "Entry saved", errorMessage: "Couldn't save the entry" },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateJournalData }) =>
      journalsApi.update(id, data),
    onSuccess: invalidate,
    meta: { successMessage: "Entry updated", errorMessage: "Couldn't update the entry" },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => journalsApi.delete(id),
    onSuccess: invalidate,
    meta: { successMessage: "Entry deleted", errorMessage: "Couldn't delete the entry" },
  });

  return { createMutation, updateMutation, deleteMutation };
}
