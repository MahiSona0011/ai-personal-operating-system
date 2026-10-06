import apiClient from "./client";
import { DEFAULT_RANGE, type RangeDays } from "@/lib/range";
import type { HabitRate } from "./habits";
import type { AIRecommendation } from "@/types";

export interface AreaSummary {
  area: { id: number; slug: string; name: string; icon: string; color: string };
  days: RangeDays;
  /** Average score over the range, 1-10, or null with no check-ins. */
  score: number | null;
  /** Change against the previous period of equal length. */
  delta: number | null;
  /** One point per day; score is null on days without a check-in. */
  series: { date: string; score: number | null }[];
  habits: HabitRate[];
  goals: { id: number; title: string; progress_pct: number; target_date: string | null; priority: number }[];
  /** Latest 3 recommendations tagged to the area. */
  recommendations: AIRecommendation[];
  metrics: { key: string; unit: string | null; latest_value: number; latest_date: string }[];
}

export const areasApi = {
  summary: (areaId: number, days: RangeDays = DEFAULT_RANGE) =>
    apiClient.get<AreaSummary>(`/areas/${areaId}/summary`, { params: { days } }).then((r) => r.data),
};
