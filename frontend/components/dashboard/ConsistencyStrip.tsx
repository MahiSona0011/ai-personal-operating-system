"use client";
import { format, subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

interface ConsistencyStripProps {
  /** Last 30 days, oldest first; true where a check-in was completed. */
  days: boolean[] | undefined;
  loading?: boolean;
  /** Anchor for the day labels; defaults to now. */
  today?: Date;
}

/** 30 squares, one per day; filled where a check-in was completed. */
export function ConsistencyStrip({ days, loading, today = new Date() }: ConsistencyStripProps) {
  const done = days?.filter(Boolean).length ?? 0;
  const total = days?.length ?? 30;

  return (
    <section aria-label="Check-in consistency" className="rounded-xl border border-border bg-surface p-4 shadow-sm dark:shadow-none">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Check-in consistency</h2>
        {!loading && (
          <span className="text-sm tabular-nums text-fg-secondary">
            {done} of {total} days
          </span>
        )}
      </header>
      {loading || !days ? (
        <Skeleton className="h-6" />
      ) : (
        <>
          {/* One image with a text summary; the squares themselves are decorative (titles show on hover). */}
          <div
            role="img"
            aria-label={`Check-in consistency, last ${total} days: ${done} of ${total} days checked in`}
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
          >
            {days.map((checked, i) => {
              const date = subDays(today, total - 1 - i);
              return (
                <div
                  key={i}
                  title={`${format(date, "EEE, MMM d")}: ${checked ? "checked in" : "no check-in"}`}
                  className={cn("aspect-square rounded-sm", checked ? "bg-accent" : "bg-elevated", i === total - 1 && "ring-1 ring-border-strong")}
                />
              );
            })}
          </div>
          {done === 0 && (
            <p className="mt-2 text-xs text-fg-secondary">Each check-in fills a square. Aim for a full row.</p>
          )}
        </>
      )}
    </section>
  );
}
