"use client";
import Link from "next/link";
import { ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { LatestInsight as Insight } from "@/lib/api/dashboard";
import { AREA_BY_KEY } from "@/lib/areas";
import { cn } from "@/lib/utils/cn";

interface LatestInsightProps {
  insight: Insight | null | undefined;
  loading?: boolean;
  /** Today's check-in is done but its AI analysis hasn't arrived yet. */
  analysing?: boolean;
}

/** The newest AI insight with its first action. The target of the hero's "View today's insight". */
export function LatestInsight({ insight, loading, analysing }: LatestInsightProps) {
  const area = insight?.action?.area ? AREA_BY_KEY[insight.action.area] : undefined;
  const headline = insight?.insight ?? insight?.summary;

  return (
    <section
      id="latest-insight"
      aria-label="Latest AI insight"
      className="h-full scroll-mt-20 rounded-xl border border-border bg-surface p-4 shadow-sm target:ring-2 target:ring-accent dark:shadow-none"
    >
      <h2 className="mb-3 text-base font-semibold text-foreground">Latest insight</h2>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-5" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-12" />
        </div>
      ) : analysing ? (
        <div className="flex items-center gap-2 py-4 text-sm text-fg-secondary">
          <Sparkles size={14} aria-hidden className="animate-pulse text-accent-fg" />
          Analysing your day. This usually takes a few seconds.
        </div>
      ) : !insight || !headline ? (
        <EmptyState
          icon={Lightbulb}
          title="Insights start after your first check-in"
          description="Each day's check-in is analysed for patterns you might not notice, with one concrete next step."
          action={{ label: "Start a check-in", href: "/checkin" }}
          className="py-4"
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-foreground">{headline}</p>
          {insight.action && (
            <div className="rounded-lg bg-elevated p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-fg-secondary">
                {area && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", area.dot)} />}
                Next step{area ? ` · ${area.name}` : ""}
              </p>
              <p className="text-sm text-foreground">{insight.action.action}</p>
            </div>
          )}
          <Link href="/analysis" className="inline-flex items-center gap-1 text-xs font-medium text-accent-fg hover:underline">
            All insights <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}
