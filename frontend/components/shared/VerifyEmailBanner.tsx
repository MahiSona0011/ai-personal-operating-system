"use client";
import { useState } from "react";
import { MailWarning, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";

/** Shown until the user confirms their email; the weekly digest only goes to verified addresses. */
export function VerifyEmailBanner() {
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(false);
  const resend = useMutation({
    mutationFn: authApi.sendVerification,
    meta: { successMessage: "Verification email sent. Check your inbox." },
  });

  if (!user || user.email_verified_at || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Verify your email"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning-fg"
    >
      <MailWarning size={16} aria-hidden />
      <span className="flex-1 min-w-0">
        Verify <strong className="font-semibold">{user.email}</strong> to receive your weekly digest.
      </span>
      <button
        type="button"
        onClick={() => resend.mutate()}
        disabled={resend.isPending || resend.isSuccess}
        className="font-medium underline underline-offset-2 hover:no-underline disabled:opacity-60 disabled:no-underline"
      >
        {resend.isSuccess ? "Sent" : resend.isPending ? "Sending…" : "Resend email"}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded p-1 hover:bg-warning/20"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
