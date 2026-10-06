import apiClient from "./client";
import { DEFAULT_RANGE, type RangeDays } from "@/lib/range";
import type { Habit, HabitWithStatus, HabitLogEntry } from "@/types";

export interface HabitRate {
  habit_id: number;
  title: string;
  life_area_id: number;
  current_streak: number;
  completed_30: number;
  expected_30: number;
  /** 0-100, or null when the habit wasn't due in the window. */
  rate_30: number | null;
}

export interface HabitCompletion {
  days: RangeDays;
  /** 0-100 over the range, or null when no habit was due. */
  overall_rate: number | null;
  series: { date: string; rate: number | null; completed: number; due: number }[];
  habits: HabitRate[];
}

export const habitsApi = {
  completion: (days: RangeDays = DEFAULT_RANGE) =>
    apiClient.get<HabitCompletion>("/habits/completion", { params: { days } }).then((r) => r.data),

  list: () => apiClient.get<Habit[]>("/habits").then((r) => r.data),

  today: () => apiClient.get<HabitWithStatus[]>("/habits/today").then((r) => r.data),

  create: (data: { life_area_id: number; title: string; frequency?: string; target_count?: number }) =>
    apiClient.post<Habit>("/habits", data).then((r) => r.data),

  update: (id: number, data: Partial<Habit>) =>
    apiClient.patch<Habit>(`/habits/${id}`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/habits/${id}`),

  log: (id: number, data: { log_date: string; completion_count?: number; notes?: string }) =>
    apiClient.post(`/habits/${id}/log`, data).then((r) => r.data),

  /** Remove the habit's log for a day (the Undo for `log`). */
  unlog: (id: number, log_date: string) =>
    apiClient.delete(`/habits/${id}/log`, { params: { log_date } }),

  streak: (id: number) => apiClient.get(`/habits/${id}/streak`).then((r) => r.data),

  logs: (id: number, days = 84) =>
    apiClient.get<HabitLogEntry[]>(`/habits/${id}/logs?days=${days}`).then((r) => r.data),
};
