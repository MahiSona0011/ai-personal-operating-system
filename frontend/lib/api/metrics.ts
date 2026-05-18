import apiClient from "./client";
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

export const metricsApi = {
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
