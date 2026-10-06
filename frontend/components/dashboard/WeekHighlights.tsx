"use client";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface WeekHighlightsProps {
  highlights: string[] | undefined;
  loading?: boolean;
}

/** Up to three plain-English lines computed from the data (no AI). */
export function WeekHighlights({ highlights, loading }: WeekHighlightsProps) {
  return (
    <section aria-label="Highlights" className="h-full rounded-xl border border-border bg-surface p-4 shadow-sm dark:shadow-none">
      <h2 className="mb-3 text-base font-semibold text-foreground">Highlights</h2>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
      ) : !highlights || highlights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Highlights appear after a few check-ins"
          description="We'll point out what moved most, how your habits are going and how long your streak is."
          className="py-4"
        />
      ) : (
        <ul className="space-y-2">
          {highlights.map((line) => (
            <li key={line} className="flex gap-2 text-sm text-foreground">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
