import apiClient from "./client";
import type { JournalEntry } from "@/types";

export interface ListJournalsParams {
  limit?: number;
  offset?: number;
  entry_date_from?: string;
  entry_date_to?: string;
  mood_tag?: string;
  life_area_tag?: string;
}

export interface CreateJournalData {
  entry_date: string;
  title?: string;
  content: string;
  mood_tag?: string;
  life_area_tags?: string[];
}

export interface UpdateJournalData {
  title?: string;
  content?: string;
  mood_tag?: string | null;
  life_area_tags?: string[];
}

export const journalsApi = {
  list: (params?: ListJournalsParams) =>
    apiClient.get<JournalEntry[]>("/journals", { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<JournalEntry>(`/journals/${id}`).then((r) => r.data),

  create: (data: CreateJournalData) =>
    apiClient.post<JournalEntry>("/journals", data).then((r) => r.data),

  update: (id: number, data: UpdateJournalData) =>
    apiClient.patch<JournalEntry>(`/journals/${id}`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/journals/${id}`),
};
