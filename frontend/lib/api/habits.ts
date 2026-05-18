import apiClient from "./client";
import type { Habit, HabitWithStatus, HabitLogEntry } from "@/types";

export const habitsApi = {
  list: () => apiClient.get<Habit[]>("/habits").then((r) => r.data),

  today: () => apiClient.get<HabitWithStatus[]>("/habits/today").then((r) => r.data),

  create: (data: { life_area_id: number; title: string; frequency?: string; target_count?: number }) =>
    apiClient.post<Habit>("/habits", data).then((r) => r.data),

  update: (id: number, data: Partial<Habit>) =>
    apiClient.patch<Habit>(`/habits/${id}`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/habits/${id}`),

  log: (id: number, data: { log_date: string; completion_count?: number; notes?: string }) =>
    apiClient.post(`/habits/${id}/log`, data).then((r) => r.data),

  streak: (id: number) => apiClient.get(`/habits/${id}/streak`).then((r) => r.data),

  logs: (id: number, days = 84) =>
    apiClient.get<HabitLogEntry[]>(`/habits/${id}/logs?days=${days}`).then((r) => r.data),
};
