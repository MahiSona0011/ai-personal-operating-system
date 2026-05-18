import apiClient from "./client";
import type { TokenResponse, User } from "@/types";

export const authApi = {
  register: (data: { email: string; password: string; full_name: string; timezone?: string }) =>
    apiClient.post<TokenResponse>("/auth/register", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  refresh: (refresh_token: string) =>
    apiClient.post<TokenResponse>("/auth/refresh", { refresh_token }).then((r) => r.data),

  logout: (refresh_token: string) =>
    apiClient.post("/auth/logout", { refresh_token }),

  me: () => apiClient.get<User>("/auth/me").then((r) => r.data),

  updateMe: (data: Partial<User>) =>
    apiClient.patch<User>("/auth/me", data).then((r) => r.data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.post("/auth/change-password", data),
};
