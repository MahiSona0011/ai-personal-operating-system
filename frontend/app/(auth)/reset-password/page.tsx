"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { errorMessage, toastSuccess } from "@/lib/toast";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a digit"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });
type FormValues = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <AuthCard title="Reset link missing">
        <p className="text-sm text-foreground">
          This page needs the link from your email.{" "}
          <Link href="/forgot-password" className="text-accent-fg underline underline-offset-2 hover:no-underline">
            Request a new one
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  const onSubmit = async ({ password }: FormValues) => {
    setError("");
    try {
      await authApi.resetPassword({ token, new_password: password });
      toastSuccess("Password updated. Sign in with your new password.");
      router.push("/login");
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AuthCard title="Choose a new password" subtitle="You'll be signed out everywhere else.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1">
          <label htmlFor="reset-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            New password
          </label>
          <Input id="reset-password" type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive-fg">{errors.password.message}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="reset-confirm" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Confirm new password
          </label>
          <Input id="reset-confirm" type="password" autoComplete="new-password" {...register("confirm")} />
          {errors.confirm && <p className="text-xs text-destructive-fg">{errors.confirm.message}</p>}
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive-fg bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {error}{" "}
            <Link href="/forgot-password" className="underline">
              Request a new link
            </Link>
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
