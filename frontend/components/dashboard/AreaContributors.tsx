"use client";
import Link from "next/link";
import { Compass } from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { AreaStat } from "@/lib/api/dashboard";
import { AREAS, type AreaKey } from "@/lib/areas";
import { cn } from "@/lib/utils/cn";

interface AreaContributorsProps {
  areas: Record<AreaKey, AreaStat> | undefined;
  loading?: boolean;
  /** Which areas feed the Life Score; the others are shown quieter. */
  selected?: AreaKey[];
}

const GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6";

/** The six areas as Oura-style contributors: score, change, 30-day sparkline, link to the area page. */
export function AreaContributors({ areas, loading, selected }: AreaContributorsProps) {
  const hasData = !!areas && AREAS.some((a) => areas[a.key]?.score != null);

  return (
    <section aria-label="Life areas" className="rounded-xl border border-border bg-surface p-4 shadow-sm dark:shadow-none">
      <h2 className="mb-3 text-base font-semibold text-foreground">Life areas</h2>
      {loading ? (
        <div className={GRID}>
          {AREAS.map((a) => (
            <Skeleton key={a.key} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={Compass}
          title="Your six areas will show up here"
          description="Health, Mind, Relationships, Work, Money and Growth each get a score, a trend and a page of their own after your first check-in."
          action={{ label: "Start a check-in", href: "/checkin" }}
          preview={
            <div className={GRID}>
              {AREAS.map((a) => (
                <div key={a.key} className="h-28 rounded-lg bg-elevated" />
              ))}
            </div>
          }
        />
      ) : (
        <ul className={GRID}>
          {AREAS.map((a) => {
            const stat = areas?.[a.key];
            const inScore = !selected || selected.includes(a.key);
            return (
              <li key={a.key}>
                <Link
                  href={a.route}
                  title={inScore ? undefined : `${a.name} isn't part of your Life Score`}
                  className={cn(
                    "block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    !inScore && "opacity-70"
                  )}
                >
                  <StatTile
                    label={a.name}
                    value={stat?.score != null ? stat.score.toFixed(1) : "—"}
                    delta={stat?.delta ?? null}
                    sparkline={stat?.sparkline_30}
                    sparklineColor={a.color}
                    borderClass={a.border}
                    className="h-full transition-colors hover:bg-elevated/70"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
