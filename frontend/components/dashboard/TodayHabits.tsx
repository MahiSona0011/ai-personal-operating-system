"use client";
import Link from "next/link";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { HabitWithStatus } from "@/types";
import { cn } from "@/lib/utils/cn";

const MAX_SHOWN = 7;

interface TodayHabitsProps {
  habits: HabitWithStatus[] | undefined;
  loading?: boolean;
  /** Called when an unfinished habit is tapped. The parent logs it optimistically and offers Undo. */
  onLog: (habit: HabitWithStatus) => void;
}

/** Today's habits with a "3/5" progress bar and one-tap logging. */
export function TodayHabits({ habits, loading, onLog }: TodayHabitsProps) {
  const total = habits?.length ?? 0;
  const done = habits?.filter((h) => h.completed_today).length ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <section aria-label="Today's habits" className="rounded-xl border border-border bg-surface p-4 shadow-sm dark:shadow-none">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Today&apos;s habits</h2>
        {!loading && total > 0 && (
          <span className="text-sm font-semibold tabular-nums text-accent-fg" aria-label={`${done} of ${total} done`}>
            {done}/{total}
          </span>
        )}
      </header>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No habits yet"
          description="Habits are small daily actions. Tick them off here and watch your consistency build."
          action={{ label: "Add a habit", href: "/habits" }}
        />
      ) : (
        <>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label="Habits done today"
            className="mb-3 h-1.5 overflow-hidden rounded-full bg-elevated"
          >
            <div className="h-full rounded-full bg-success transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <ul className="space-y-0.5">
            {habits!.slice(0, MAX_SHOWN).map((habit) => (
              <li key={habit.id}>
                <button
                  type="button"
                  disabled={habit.completed_today}
                  onClick={() => onLog(habit)}
                  aria-pressed={habit.completed_today}
                  className="group flex w-full items-center gap-3 rounded px-2 py-1.5 text-left transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default disabled:hover:bg-transparent"
                >
                  {habit.completed_today ? (
                    <CheckCircle2 size={16} aria-hidden className="shrink-0 text-success-fg" />
                  ) : (
                    <Circle size={16} aria-hidden className="shrink-0 text-fg-muted group-hover:text-accent-fg" />
                  )}
                  <span className={cn("truncate text-sm", habit.completed_today ? "text-fg-muted line-through" : "text-foreground")}>
                    {habit.title}
                  </span>
                  {habit.current_streak > 0 && (
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-fg-muted">{habit.current_streak} day streak</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {total > MAX_SHOWN && (
            <Link href="/habits" className="mt-1 block pt-1 text-center text-xs text-accent-fg hover:underline">
              +{total - MAX_SHOWN} more
            </Link>
          )}
        </>
      )}
    </section>
  );
}
