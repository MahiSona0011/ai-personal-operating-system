import apiClient from "./client";
import { DEFAULT_RANGE, type RangeDays } from "@/lib/range";
import type { AreaKey } from "@/lib/areas";
import type { Checkin } from "@/types";

/** One calendar day in the user's timezone. Every value is null on a day without a check-in. */
export interface TrendPoint {
  date: string;
  life_score: number | null;
  mood: number | null;
  energy: number | null;
  areas: Record<AreaKey, number | null>;
}

export interface CheckinTrend {
  points: TrendPoint[];
  /** Trailing 7-day mean of the Life Score, aligned with `points`. */
  moving_avg_7: { date: string; value: number | null }[];
}

export const checkinsApi = {
  today: () => apiClient.get<Checkin>("/checkins/today").then((r) => r.data),

  create: (data: Partial<Checkin> & { checkin_date: string }) =>
    apiClient.post<Checkin>("/checkins", data).then((r) => r.data),

  update: (id: number, data: Partial<Checkin>) =>
    apiClient.patch<Checkin>(`/checkins/${id}`, data).then((r) => r.data),

  complete: (id: number) =>
    apiClient.post<Checkin>(`/checkins/${id}/complete`).then((r) => r.data),

  trend: (days: RangeDays = DEFAULT_RANGE) =>
    apiClient.get<CheckinTrend>("/checkins/trend", { params: { days } }).then((r) => r.data),
};
