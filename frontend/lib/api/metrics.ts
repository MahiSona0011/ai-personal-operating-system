import apiClient from "./client";
import { DEFAULT_RANGE, type RangeDays } from "@/lib/range";
import type { Metric } from "@/types";

export interface ListMetricsParams {
  limit?: number;
  offset?: number;
  life_area_id?: number;
  metric_key?: string;
  date_from?: string;
  date_to?: string;
}

export interface CreateMetricData {
  life_area_id: number;
  metric_key: string;
  metric_date: string;
  value_numeric?: number;
  unit?: string;
}

export interface UpdateMetricData {
  metric_date?: string;
  value_numeric?: number;
  unit?: string;
}

export interface MetricSeriesParams {
  key: string;
  area_id?: number;
  days?: RangeDays;
}

export interface MetricSeries {
  key: string;
  area_id: number | null;
  days: RangeDays;
  unit: string | null;
  /** One point per day with data; several entries on a day are averaged. */
  points: { date: string; value: number; n: number }[];
  latest: { date: string; value: number; n: number } | null;
  average: number | null;
  /** Average against the previous period of equal length. */
  delta: number | null;
}

export const metricsApi = {
  series: ({ key, area_id, days = DEFAULT_RANGE }: MetricSeriesParams) =>
    apiClient.get<MetricSeries>("/metrics/series", { params: { key, area_id, days } }).then((r) => r.data),

  list: (params?: ListMetricsParams) =>
    apiClient.get<Metric[]>("/metrics", { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Metric>(`/metrics/${id}`).then((r) => r.data),

  create: (data: CreateMetricData) =>
    apiClient.post<Metric>("/metrics", data).then((r) => r.data),

  update: (id: number, data: UpdateMetricData) =>
    apiClient.patch<Metric>(`/metrics/${id}`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/metrics/${id}`),
};
