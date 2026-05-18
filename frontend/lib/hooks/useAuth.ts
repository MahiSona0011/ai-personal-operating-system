"use client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api/auth";

export function useAuth() {
  const router = useRouter();
  const { user, setAuth, clearAuth, isAuthenticated } = useAuthStore();

  const login = async (email: string, password: string) => {
    const tokens = await authApi.login({ email, password });
    if (typeof window !== "undefined") {
      sessionStorage.setItem("access_token", tokens.access_token);
      document.cookie = `refresh_token=${tokens.refresh_token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    }
    const me = await authApi.me();
    setAuth(me, tokens.access_token, tokens.refresh_token);
    router.push("/dashboard");
  };

  const register = async (email: string, password: string, full_name: string) => {
    const tokens = await authApi.register({ email, password, full_name });
    if (typeof window !== "undefined") {
      sessionStorage.setItem("access_token", tokens.access_token);
      document.cookie = `refresh_token=${tokens.refresh_token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    }
    const me = await authApi.me();
    setAuth(me, tokens.access_token, tokens.refresh_token);
    router.push("/dashboard");
  };

  const logout = async () => {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    if (typeof window !== "undefined") {
      document.cookie = "refresh_token=; path=/; max-age=0";
      sessionStorage.removeItem("access_token");
    }
    clearAuth();
    router.push("/login");
  };

  return { user, login, register, logout, isAuthenticated };
}
