"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { errorMessage } from "@/lib/toast";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    setError("");
    try {
      await authApi.forgotPassword(email);
      setSentTo(email);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (sentTo) {
    return (
      <AuthCard title="Check your email">
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck size={28} className="text-accent-fg" aria-hidden />
          <p className="text-sm text-foreground">
            If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. It works once and
            expires in 1 hour.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1">
          <label htmlFor="forgot-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Email
          </label>
          <Input id="forgot-email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive-fg">{errors.email.message}</p>}
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive-fg bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
