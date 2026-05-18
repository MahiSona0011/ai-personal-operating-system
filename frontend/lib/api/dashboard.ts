import apiClient from "./client";

export interface DashboardData {
  user: { display_name: string; onboarding_state: string };
  today: {
    checkin: { id: number; overall_score: number | null; is_complete: boolean; ai_analysis: unknown } | null;
    habits_summary: { total: number; completed: number; due_today: Array<{ id: number; title: string; life_area_id: number }> };
  };
  life_area_scores: Record<string, { today: number | null; week_avg: number | null; trend: "up" | "down" | "stable" }>;
}

export const dashboardApi = {
  get: () => apiClient.get<DashboardData>("/dashboard").then((r) => r.data),
};
