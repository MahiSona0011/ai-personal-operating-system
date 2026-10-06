"use client";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionCard } from "@/components/learning/SessionCard";
import { useSessionMutations, useSessionsList, useSessionStats } from "@/lib/hooks/useSessions";

/** Recent learning sessions on the Growth page, with a link to the full log. */
export function LearningPanel({ areaId }: { areaId: number }) {
  const { data: sessions, isLoading } = useSessionsList({ life_area_id: areaId, limit: 5 });
  const { data: stats } = useSessionStats(84, { life_area_id: areaId });
  const { deleteMutation } = useSessionMutations();
  const minutes = stats?.total_minutes ?? 0;

  return (
    <section aria-label="Learning sessions" className="rounded-xl border border-border bg-surface p-4 shadow-sm dark:shadow-none">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Learning sessions</h2>
          {minutes > 0 && (
            <p className="text-xs text-fg-secondary">
              {(minutes / 60).toFixed(1).replace(/\.0$/, "")} hours over the last 12 weeks
            </p>
          )}
        </div>
        <Link href="/learning" className="text-xs font-medium text-accent-fg hover:underline">
          All sessions
        </Link>
      </header>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No learning sessions yet"
          description="Log what you studied or practised and how long it took, and it will build up here."
          action={{ label: "Log a session", href: "/learning" }}
          className="py-4"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </section>
  );
}
