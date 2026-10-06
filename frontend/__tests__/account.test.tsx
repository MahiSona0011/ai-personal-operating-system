import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { NextRequest } from "next/server";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ default: api }));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});

const nav = vi.hoisted(() => ({ push: vi.fn(), search: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(nav.search),
}));
const setTheme = vi.hoisted(() => vi.fn());
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme, resolvedTheme: "light" }) }));
vi.mock("@/components/profile/AvatarUpload", () => ({ AvatarUpload: () => null }));

import { toast } from "sonner";
import { createQueryClient } from "@/lib/query-client";
import { ConfirmHost } from "@/components/ui/confirm-host";
import { useAuthStore } from "@/store/authStore";
import { middleware } from "../middleware";
import SettingsPage from "@/app/(dashboard)/settings/page";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";
import VerifyEmailPage from "@/app/(auth)/verify-email/page";
import { VerifyEmailBanner } from "@/components/shared/VerifyEmailBanner";
import type { User } from "@/types";

const USER: User = {
  id: 1, email: "m@x.com", full_name: "Mahi Sonani", display_name: null, timezone: "America/Toronto", avatar_url: null,
  onboarding_state: "complete", preferences: null, email_verified_at: null, theme_preference: "system", digest_enabled: true,
  is_active: true, last_login_at: null, created_at: "",
};

function renderWithApp(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      {ui}
      <ConfirmHost />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.search = "";
  useAuthStore.setState({ user: USER, accessToken: "t", refreshToken: "r" });
});

describe("forgot password", () => {
  it("shows the same confirmation whatever the API says about the account", async () => {
    api.post.mockResolvedValue({ data: { message: "If an account exists…" } });
    renderWithApp(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText("Email"), "someone@x.com");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(/a reset link is on its way/i)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/auth/forgot-password", { email: "someone@x.com" });
  });

  it("validates the email before calling the API", async () => {
    renderWithApp(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText("Email"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("reset password", () => {
  it("asks for the emailed link when the token is missing", () => {
    renderWithApp(<ResetPasswordPage />);
    expect(screen.getByText("Reset link missing")).toBeInTheDocument();
  });

  it("rejects mismatched passwords, then submits the token and goes to login", async () => {
    nav.search = "token=abc123";
    api.post.mockResolvedValue({ data: null });
    renderWithApp(<ResetPasswordPage />);
    await userEvent.type(screen.getByLabelText("New password"), "Newpass99");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "Different9");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText("Confirm new password"));
    await userEvent.type(screen.getByLabelText("Confirm new password"), "Newpass99");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/login"));
    expect(api.post).toHaveBeenCalledWith("/auth/reset-password", { token: "abc123", new_password: "Newpass99" });
  });

  it("shows the server's message and a way to request a new link when the token is bad", async () => {
    nav.search = "token=old";
    api.post.mockRejectedValue({ response: { status: 400, data: { detail: "This link is invalid or has expired" } } });
    renderWithApp(<ResetPasswordPage />);
    await userEvent.type(screen.getByLabelText("New password"), "Newpass99");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "Newpass99");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This link is invalid or has expired");
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/forgot-password");
  });
});

describe("verify email", () => {
  it("verifies once and refreshes the stored user", async () => {
    nav.search = "token=tok";
    api.get.mockImplementation((url: string) =>
      Promise.resolve({ data: url === "/auth/me" ? { ...USER, email_verified_at: "2026-10-06T00:00:00Z" } : null })
    );
    renderWithApp(<VerifyEmailPage />);
    expect(await screen.findByText(/Your email is verified/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/auth/verify-email", { params: { token: "tok" } });
    await waitFor(() => expect(useAuthStore.getState().user?.email_verified_at).toBeTruthy());
  });

  it("reports an expired link", async () => {
    nav.search = "token=tok";
    api.get.mockRejectedValue({ response: { status: 400, data: { detail: "This link is invalid or has expired" } } });
    renderWithApp(<VerifyEmailPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid or has expired");
  });
});

describe("verify-email banner", () => {
  it("shows for unverified users, resends, and hides once verified", async () => {
    api.post.mockResolvedValue({ data: { message: "Verification email sent." } });
    const { unmount } = renderWithApp(<VerifyEmailBanner />);
    await userEvent.click(screen.getByRole("button", { name: "Resend email" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith("/auth/verify-email/send");
    unmount();

    useAuthStore.setState({ user: { ...USER, email_verified_at: "2026-10-06T00:00:00Z" } });
    renderWithApp(<VerifyEmailBanner />);
    expect(screen.queryByRole("region", { name: "Verify your email" })).toBeNull();
  });
});

describe("settings page", () => {
  it("labels every field", () => {
    renderWithApp(<SettingsPage />);
    for (const name of ["Full name", "Display name", "Timezone", "Current password", "New password", "Confirm new password", "Your password"]) {
      expect(screen.getByLabelText(name), name).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument();
  });

  it("changing the theme applies it now and saves it to the account", async () => {
    api.patch.mockResolvedValue({ data: { ...USER, theme_preference: "dark" } });
    renderWithApp(<SettingsPage />);
    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(setTheme).toHaveBeenCalledWith("dark");
    expect(api.patch).toHaveBeenCalledWith("/auth/me", { theme_preference: "dark" });
    expect(useAuthStore.getState().user?.theme_preference).toBe("dark");
  });

  it("toggling the digest saves and toasts", async () => {
    api.patch.mockResolvedValue({ data: { ...USER, digest_enabled: false } });
    renderWithApp(<SettingsPage />);
    await userEvent.click(screen.getByRole("switch", { name: /Weekly digest email/ }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/auth/me", { digest_enabled: false }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Digest preference saved", expect.anything()));
  });

  it("a wrong current password surfaces the server's error as a toast", async () => {
    api.post.mockRejectedValue({ response: { status: 400, data: { detail: "Current password is incorrect" } } });
    renderWithApp(<SettingsPage />);
    await userEvent.type(screen.getByLabelText("Current password"), "Wrong1234");
    await userEvent.type(screen.getByLabelText("New password"), "Newpass99");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "Newpass99");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Current password is incorrect"));
  });

  it("deleting the account needs the password and the typed word DELETE", async () => {
    api.delete.mockResolvedValue({ data: null });
    api.post.mockResolvedValue({ data: null });
    renderWithApp(<SettingsPage />);
    const remove = screen.getByRole("button", { name: "Delete my account" });
    expect(remove).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Your password"), "Test1234!");
    await userEvent.click(remove);
    const dialog = await screen.findByRole("alertdialog");
    expect(api.delete).not.toHaveBeenCalled();

    const confirmBtn = Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "Delete my account")!;
    expect(confirmBtn).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox"), "DELETE");
    await userEvent.click(confirmBtn);
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/auth/me", { data: { password: "Test1234!" } }));
  });
});

describe("middleware", () => {
  it("lets signed-out users reach reset-password and verify-email", () => {
    for (const path of ["/forgot-password", "/reset-password", "/verify-email"]) {
      const res = middleware(new NextRequest(`http://localhost:3000${path}?token=x`));
      expect(res.headers.get("location"), path).toBeNull();
    }
  });
});
