"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";

export type ThemePreference = User["theme_preference"];

/** Apply the account's saved theme once per sign-in, so it follows the user across devices. */
export function useSyncThemeFromAccount() {
  const { setTheme } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const saved = useAuthStore((s) => s.user?.theme_preference);
  const appliedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!userId || !saved || appliedFor.current === userId) return;
    appliedFor.current = userId;
    setTheme(saved);
  }, [userId, saved, setTheme]);
}

/** Change the theme now and remember it on the account (best effort; the local change never waits on the network). */
export function useSetThemePreference() {
  const { setTheme } = useTheme();
  const setUser = useAuthStore((s) => s.setUser);

  return (preference: ThemePreference) => {
    setTheme(preference);
    const user = useAuthStore.getState().user;
    if (!user) return;
    setUser({ ...user, theme_preference: preference });
    authApi.updateMe({ theme_preference: preference }).catch(() => {
      /* the choice still applies on this device */
    });
  };
}
