"use client";
import { format } from "date-fns";

/** "Good morning" / "Good afternoon" / "Good evening" for a local hour (0-23). */
export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface GreetingHeaderProps {
  name?: string | null;
  now?: Date;
}

export function GreetingHeader({ name, now = new Date() }: GreetingHeaderProps) {
  const first = name?.trim().split(/\s+/)[0];
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h1 className="text-2xl font-semibold text-foreground" suppressHydrationWarning>
        {greetingFor(now.getHours())}
        {first ? `, ${first}` : ""}
      </h1>
      <p className="text-sm text-fg-secondary" suppressHydrationWarning>
        {format(now, "EEEE, MMMM d")}
      </p>
    </header>
  );
}
