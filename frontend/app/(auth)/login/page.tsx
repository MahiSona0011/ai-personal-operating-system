"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setError("");
    try {
      await login(data.email, data.password);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Login failed. Check your credentials.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gradient">Selfstack</h1>
          <p className="text-muted-foreground text-sm mt-2">Sign in to your account</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <Input type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive-fg">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-xs text-accent-fg hover:underline">Forgot password?</Link>
              </div>
              <Input id="login-password" type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive-fg">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="text-xs text-destructive-fg bg-destructive/10 border border-destructive/20 rounded-md p-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/register" className="text-accent-fg underline underline-offset-2 hover:no-underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
