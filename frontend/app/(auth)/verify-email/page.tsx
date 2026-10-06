"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { errorMessage } from "@/lib/toast";

type State = { status: "working" } | { status: "ok" } | { status: "failed"; message: string };

function VerifyEmail() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>(token ? { status: "working" } : { status: "failed", message: "This link is missing its token." });
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return; // a token is single-use: never send it twice (React strict mode)
    ran.current = true;
    authApi
      .verifyEmail(token)
      .then(async () => {
        setState({ status: "ok" });
        if (useAuthStore.getState().user) {
          try {
            useAuthStore.getState().setUser(await authApi.me());
          } catch {
            /* the banner will refresh on the next page load */
          }
        }
      })
      .catch((e) => setState({ status: "failed", message: errorMessage(e) }));
  }, [token]);

  return (
    <AuthCard title="Email verification">
      {state.status === "working" && <p className="text-sm text-muted-foreground" role="status">Verifying…</p>}
      {state.status === "ok" && (
        <div className="flex flex-col items-center gap-3 text-center" role="status">
          <CheckCircle2 size={28} className="text-success-fg" aria-hidden />
          <p className="text-sm text-foreground">Your email is verified. Your weekly digest is switched on.</p>
          <Link href="/dashboard" className="text-sm text-accent-fg hover:underline">
            Go to dashboard
          </Link>
        </div>
      )}
      {state.status === "failed" && (
        <div className="flex flex-col items-center gap-3 text-center" role="alert">
          <XCircle size={28} className="text-destructive-fg" aria-hidden />
          <p className="text-sm text-foreground">{state.message}</p>
          <p className="text-xs text-muted-foreground">Sign in and use “Resend” in the banner or Settings to get a new link.</p>
        </div>
      )}
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
