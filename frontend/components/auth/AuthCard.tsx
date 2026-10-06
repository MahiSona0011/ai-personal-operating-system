import Link from "next/link";

/** The centered card shared by the signed-out account pages (forgot/reset password, verify email). */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-gradient">Selfstack</p>
          <h1 className="text-lg font-semibold text-foreground mt-4">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">{children}</div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link href="/login" className="text-accent-fg hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
