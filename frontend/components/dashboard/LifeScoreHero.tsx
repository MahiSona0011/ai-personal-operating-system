"use client";
import Link from "next/link";
import { Flame } from "lucide-react";
import { Delta } from "@/components/ui/delta";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { LifeScoreRing } from "@/components/dashboard/LifeScoreRing";
import { previousPeriodLabel } from "@/lib/chart-summary";
import { cn } from "@/lib/utils/cn";

interface LifeScoreHeroProps {
  /** Average Life Score over the selected range. */
  score: number | null;
  delta: number | null;
  days: number;
  streak: number;
  /** Whether today's check-in is complete; undefined while it loads. */
  checkinComplete?: boolean;
  loading?: boolean;
}

/** The one primary action on the dashboard: start the check-in, then view its insight. */
export function LifeScoreHero({ score, delta, days, streak, checkinComplete, loading }: LifeScoreHeroProps) {
  const done = checkinComplete === true;
  return (
    <section
      aria-label="Life Score"
      className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm dark:shadow-none"
    >
      <LifeScoreRing score={score} loading={loading} caption={`${days === 365 ? "1-year" : `${days}-day`} avg`} />

      {loading ? (
        <Skeleton className="h-4 w-32" />
      ) : score == null ? (
        <p className="max-w-[16rem] text-center text-sm text-fg-secondary">
          Complete a check-in to get your first Life Score.
        </p>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <Delta delta={delta} digits={1} />
          <span className="text-fg-muted">{delta == null ? "no earlier data to compare" : previousPeriodLabel(days)}</span>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-sm text-fg-secondary">
        <Flame size={14} aria-hidden className={streak > 0 ? "text-warning-fg" : "text-fg-muted"} />
        {streak > 0 ? `Check-in streak: ${streak} ${streak === 1 ? "day" : "days"}` : "Start a check-in streak today"}
      </p>

      {loading || checkinComplete === undefined ? (
        <Skeleton className="h-9 w-full max-w-[16rem]" />
      ) : (
        <Link
          href={done ? "#latest-insight" : "/checkin"}
          className={cn(buttonVariants({ size: "default" }), "w-full max-w-[16rem]")}
        >
          {done ? "View today's insight" : "Start today's check-in"}
        </Link>
      )}
    </section>
  );
}
