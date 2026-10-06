import apiClient from "./client";
import { DEFAULT_RANGE, type RangeDays } from "@/lib/range";
import type { AreaKey } from "@/lib/areas";

export interface AreaStat {
  /** Average over the selected range, 1-10. */
  score: number | null;
  /** Change against the previous period of equal length. */
  delta: number | null;
  /** Last 30 days, oldest first; null on days without a check-in. */
  sparkline_30: (number | null)[];
}

export interface LatestInsight {
  id: number;
  type: string;
  summary: string | null;
  insight: string | null;
  action: { action: string; area: string | null; priority: number } | null;
  action_items: unknown[];
  created_at: string;
}

export interface DashboardData {
  user: { display_name: string; onboarding_state: string };
  today: {
    checkin: { id: number; overall_score: number | null; is_complete: boolean; ai_analysis: unknown } | null;
    habits_summary: { total: number; completed: number; due_today: Array<{ id: number; title: string; life_area_id: number }> };
  };
  life_area_scores: Record<string, { today: number | null; week_avg: number | null; trend: "up" | "down" | "stable" }>;
  days: RangeDays;
  selected_areas: AreaKey[];
  /** Average Life Score over the range; null with no check-ins. */
  life_score: number | null;
  life_score_delta: number | null;
  checkin_streak: number;
  /** Last 30 days, oldest first. */
  checkin_consistency_30: boolean[];
  areas: Record<AreaKey, AreaStat>;
  /** Up to three rule-based lines. */
  highlights: string[];
  latest_insight: LatestInsight | null;
}

export const dashboardApi = {
  get: (days: RangeDays = DEFAULT_RANGE) =>
    apiClient.get<DashboardData>("/dashboard", { params: { days } }).then((r) => r.data),
};
