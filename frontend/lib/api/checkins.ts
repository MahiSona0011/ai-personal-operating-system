import apiClient from "./client";
import type { Checkin } from "@/types";

export const checkinsApi = {
  today: () => apiClient.get<Checkin>("/checkins/today").then((r) => r.data),

  create: (data: Partial<Checkin> & { checkin_date: string }) =>
    apiClient.post<Checkin>("/checkins", data).then((r) => r.data),

  update: (id: number, data: Partial<Checkin>) =>
    apiClient.patch<Checkin>(`/checkins/${id}`, data).then((r) => r.data),

  complete: (id: number) =>
    apiClient.post<Checkin>(`/checkins/${id}/complete`).then((r) => r.data),

  trend: (days = 30) =>
    apiClient.get<Checkin[]>(`/checkins/trend?days=${days}`).then((r) => r.data),
};
