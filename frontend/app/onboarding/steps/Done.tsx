"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";

export default function Done() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.completeOnboarding()
      .then((user) => {
        setUser(user);
        setTimeout(() => router.push("/dashboard"), 1200);
      })
      .catch(() => {
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [router, setUser]);

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl transition-all duration-500 ${loading ? "bg-elevated" : "bg-success/15"}`}>
        {loading ? (
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        ) : (
          "🎉"
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          {loading ? "Setting things up…" : "You're all set!"}
        </h2>
        <p className="text-sm text-fg-secondary max-w-xs">
          {loading
            ? "Just a moment while we prepare your dashboard."
            : "Taking you to your dashboard now."}
        </p>
      </div>
    </div>
  );
}
