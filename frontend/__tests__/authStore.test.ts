import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";

const mockUser: User = {
  id: 1,
  email: "test@example.com",
  full_name: "Test User",
  display_name: null,
  timezone: "UTC",
  avatar_url: null,
  onboarding_state: "pending",
  preferences: null,
  email_verified_at: null,
  theme_preference: "system",
  digest_enabled: true,
  is_active: true,
  last_login_at: null,
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, onboardingState: null });
});

describe("authStore", () => {
  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });

  it("setAuth stores user and tokens", () => {
    useAuthStore.getState().setAuth(mockUser, "access-token", "refresh-token");
    const state = useAuthStore.getState();
    expect(state.user?.email).toBe("test@example.com");
    expect(state.accessToken).toBe("access-token");
    expect(state.onboardingState).toBe("pending");
    expect(state.isAuthenticated()).toBe(true);
  });

  it("clearAuth removes all state", () => {
    useAuthStore.getState().setAuth(mockUser, "tok", "ref");
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.onboardingState).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });

  it("setUser updates onboarding_state when complete", () => {
    useAuthStore.getState().setAuth(mockUser, "tok", "ref");
    useAuthStore.getState().setUser({ ...mockUser, onboarding_state: "complete" });
    expect(useAuthStore.getState().onboardingState).toBe("complete");
  });
});
