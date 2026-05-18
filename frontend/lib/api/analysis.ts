import apiClient from "./client";
import type { AIRecommendation, WeeklyReview } from "@/types";

export const analysisApi = {
  retriggerCheckin: (checkinId: number) =>
    apiClient.post(`/analysis/checkin/${checkinId}`).then((r) => r.data),

  onDemand: (data: { question: string; context_areas?: string[]; include_recent_data?: boolean }) =>
    apiClient.post<AIRecommendation>("/analysis/on-demand", data).then((r) => r.data),

  recommendations: (params?: { type?: string; include_dismissed?: boolean; limit?: number; offset?: number }) =>
    apiClient.get<AIRecommendation[]>("/analysis/recommendations", { params }).then((r) => r.data),

  updateRecommendation: (
    id: number,
    data: { is_dismissed?: boolean; is_actioned?: boolean; user_rating?: number },
  ) => apiClient.patch<AIRecommendation>(`/analysis/recommendations/${id}`, data).then((r) => r.data),

  generateWeekly: (week_start: string) =>
    apiClient.post<WeeklyReview>("/analysis/reviews/weekly", { week_start }).then((r) => r.data),

  weeklyReviews: (limit = 12) =>
    apiClient.get<WeeklyReview[]>("/analysis/reviews/weekly", { params: { limit } }).then((r) => r.data),
};
