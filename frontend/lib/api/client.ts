"use client";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Attach access token from Next.js Route Handler cookie bridge
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true; // queued requests too: a second 401 after a fresh token is a real 401

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    isRefreshing = true;

    try {
      const { useAuthStore } = await import("@/store/authStore");
      const refreshToken = useAuthStore.getState().refreshToken;
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken }, { withCredentials: true });
      const newToken: string = data.access_token;
      sessionStorage.setItem("access_token", newToken);
      if (data.refresh_token) {
        // Refresh tokens rotate: the one we just used is retired, and presenting it again signs the user out.
        useAuthStore.setState({ accessToken: newToken, refreshToken: data.refresh_token });
        document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
      }
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Drop the session cookie too, or the middleware sends /login straight back to the app and we loop.
      const { useAuthStore } = await import("@/store/authStore");
      useAuthStore.getState().clearAuth();
      document.cookie = "refresh_token=; path=/; max-age=0";
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
