import apiClient from "./client";
import type { WorkSession, SessionStats } from "@/types";

export const sessionsApi = {
  list: (params?: { life_area_id?: number; limit?: number; offset?: number }) =>
    apiClient.get<WorkSession[]>("/sessions", { params }).then((r) => r.data),

  create: (data: {
    life_area_id: number;
    goal_id?: number;
    session_type?: string;
    title: string;
    notes?: string;
    started_at: string;
    ended_at?: string;
    duration_minutes?: number;
    quality_rating?: number;
  }) => apiClient.post<WorkSession>("/sessions", data).then((r) => r.data),

  update: (id: number, data: Partial<Pick<WorkSession, "title" | "notes" | "ended_at" | "duration_minutes" | "quality_rating" | "goal_id">>) =>
    apiClient.patch<WorkSession>(`/sessions/${id}`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/sessions/${id}`),

  stats: (days = 84) =>
    apiClient.get<SessionStats>("/sessions/stats", { params: { days } }).then((r) => r.data),
};
