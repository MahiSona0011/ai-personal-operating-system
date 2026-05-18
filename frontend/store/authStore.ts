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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("access_token", accessToken);
        }
        set({ user, accessToken, refreshToken });
      },

      setUser: (user) => set({ user }),

      clearAuth: () => {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("access_token");
        }
        set({ user: null, accessToken: null, refreshToken: null });
      },

      isAuthenticated: () => !!get().user && !!get().accessToken,
    }),
    {
      name: "aipos-auth",
      partialize: (state) => ({ user: state.user, refreshToken: state.refreshToken }),
    }
  )
);
