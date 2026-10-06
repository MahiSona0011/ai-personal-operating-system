import apiClient from "./client";
import type { Goal, Milestone } from "@/types";

export const goalsApi = {
  list: () => apiClient.get<Goal[]>("/goals").then((r) => r.data),

  create: (data: {
    life_area_id: number;
    title: string;
    description?: string;
    why?: string;
    priority?: number;
    target_date?: string;
  }) => apiClient.post<Goal>("/goals", data).then((r) => r.data),

  update: (id: number, data: Partial<Pick<Goal, "title" | "description" | "why" | "status" | "priority" | "progress_pct" | "target_date">>) =>
    apiClient.patch<Goal>(`/goals/${id}`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/goals/${id}`),

  complete: (id: number) => apiClient.post<Goal>(`/goals/${id}/complete`).then((r) => r.data),

  addMilestone: (goalId: number, data: { title: string; due_date?: string; sort_order?: number }) =>
    apiClient.post<Milestone>(`/goals/${goalId}/milestones`, data).then((r) => r.data),

  completeMilestone: (goalId: number, milestoneId: number) =>
    apiClient.post<Milestone>(`/goals/${goalId}/milestones/${milestoneId}/complete`).then((r) => r.data),

  /** Undo for completeMilestone. */
  uncompleteMilestone: (goalId: number, milestoneId: number) =>
    apiClient.post<Milestone>(`/goals/${goalId}/milestones/${milestoneId}/uncomplete`).then((r) => r.data),
};
