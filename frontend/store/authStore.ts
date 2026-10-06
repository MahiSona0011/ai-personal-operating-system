"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  onboardingState: "pending" | "complete" | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      onboardingState: null,

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("access_token", accessToken);
          document.cookie = `onboarding_state=${user.onboarding_state}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
        }
        set({ user, accessToken, refreshToken, onboardingState: user.onboarding_state });
      },

      setUser: (user) => {
        if (typeof window !== "undefined") {
          document.cookie = `onboarding_state=${user.onboarding_state}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
        }
        set({ user, onboardingState: user.onboarding_state });
      },

      clearAuth: () => {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("access_token");
          document.cookie = "onboarding_state=; path=/; max-age=0";
        }
        set({ user: null, accessToken: null, refreshToken: null, onboardingState: null });
      },

      isAuthenticated: () => !!get().user && !!get().accessToken,
    }),
    {
      name: "aipos-auth",
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
        onboardingState: state.onboardingState,
      }),
    }
  )
);
