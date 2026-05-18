"use client";
import { useState } from "react";
import { Plus, BookOpen, Clock, Star, BarChart2 } from "lucide-react";
import { format, parseISO, startOfWeek, isSameWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionCard } from "@/components/learning/SessionCard";
import { LogSessionModal } from "@/components/learning/LogSessionModal";
import { useSessionsList, useSessionStats, useSessionMutations } from "@/lib/hooks/useSessions";
import { LIFE_AREAS } from "@/types";
import type { WorkSession } from "@/types";

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] px-5 py-3 min-w-[100px]">
      <span style={{ color }}>{icon}</span>
      <span className="text-lg font-bold text-[hsl(var(--fg-primary))]">{value}</span>
      <span className="text-xs text-[hsl(var(--fg-secondary))]">{label}</span>
    </div>
  );
}

export default function LearningPage() {
  const { data: sessions, isLoading: sessionsLoading } = useSessionsList({ limit: 200 });
  const { data: stats, isLoading: statsLoading } = useSessionStats(84);
  const { createMutation, deleteMutation } = useSessionMutations();

  const [modalOpen, setModalOpen] = useState(false);

  function handleLogSession(data: Parameters<typeof createMutation.mutate>[0]) {
    createMutation.mutate(data, { onSuccess: () => setModalOpen(false) });
  }

  // Group sessions by date (most recent first)
  const grouped: { date: string; sessions: WorkSession[] }[] = [];
  if (sessions) {
    const buckets: Record<string, WorkSession[]> = {};
    for (const s of sessions) {
      const d = s.started_at.slice(0, 10);
      (buckets[d] ??= []).push(s);
    }
    for (const [date, sess] of Object.entries(buckets).sort((a, b) => b[0].localeCompare(a[0]))) {
      grouped.push({ date, sessions: sess });
    }
  }

  const totalMinutes = stats?.total_minutes ?? 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMin = totalMinutes % 60;
  const hoursLabel = totalHours > 0 ? `${totalHours}h ${remainingMin}m` : `${remainingMin}m`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--fg-primary))]">Learning & Sessions</h1>
          <p className="text-sm text-[hsl(var(--fg-secondary))] mt-0.5">Last 12 weeks</p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus size={15} className="mr-1" /> Log session
        </Button>
      </div>

      {/* Stats strip */}
      {statsLoading ? (
        <div className="flex gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-28 rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="flex gap-3 flex-wrap mb-6">
          <StatPill
            icon={<Clock size={18} />}
            label="Total time"
            value={hoursLabel}
            color="hsl(var(--area-focus))"
          />
          <StatPill
            icon={<BarChart2 size={18} />}
            label="Sessions"
            value={String(stats.session_count)}
            color="hsl(var(--area-learning))"
          />
          {stats.avg_quality != null && (
            <StatPill
              icon={<Star size={18} />}
              label="Avg quality"
              value={`${stats.avg_quality}/5`}
              color="hsl(var(--area-mental))"
            />
          )}
          {/* Top area */}
          {Object.keys(stats.by_area).length > 0 && (() => {
            const topAreaId = Object.entries(stats.by_area).sort((a, b) => b[1] - a[1])[0][0];
            const topArea = LIFE_AREAS.find((a) => a.id === Number(topAreaId));
            if (!topArea) return null;
            return (
              <StatPill
                icon={<BookOpen size={18} />}
                label="Top area"
                value={topArea.name}
                color={topArea.color}
              />
            );
          })()}
        </div>
      ) : null}

      {/* Weekly breakdown bar */}
      {stats && stats.by_week.length > 0 && (
        <div className="mb-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <p className="text-xs text-[hsl(var(--fg-secondary))] mb-3 font-medium uppercase tracking-wide">Weekly minutes</p>
          <div className="flex items-end gap-1 h-14">
            {(() => {
              const max = Math.max(...stats.by_week.map((w) => w.minutes), 1);
              return stats.by_week.slice(-12).map((w) => {
                const pct = (w.minutes / max) * 100;
                const isCurrentWeek = isSameWeek(parseISO(w.week_start), new Date(), { weekStartsOn: 1 });
                return (
                  <div key={w.week_start} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className={`w-full rounded-t transition-all ${isCurrentWeek ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--border))] group-hover:bg-[hsl(var(--accent)/0.6)]"}`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                    <span className="absolute -top-5 text-[10px] text-[hsl(var(--fg-secondary))] opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {w.minutes}m
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Session list */}
      {sessionsLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      )}

      {!sessionsLoading && grouped.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <BookOpen size={40} className="text-[hsl(var(--fg-secondary))]" />
          <p className="text-[hsl(var(--fg-secondary))]">No sessions yet. Log your first focused block.</p>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={15} className="mr-1" /> Log session
          </Button>
        </div>
      )}

      {!sessionsLoading && grouped.length > 0 && (
        <div className="flex flex-col gap-6">
          {grouped.map(({ date, sessions: daySessions }) => {
            const dayTotal = daySessions.reduce((s, x) => s + (x.duration_minutes ?? 0), 0);
            return (
              <section key={date}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-[hsl(var(--fg-primary))]">
                    {format(parseISO(date), "EEEE, MMM d")}
                  </span>
                  {dayTotal > 0 && (
                    <span className="text-xs text-[hsl(var(--fg-secondary))]">{dayTotal}m total</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {daySessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      onDelete={(id) => deleteMutation.mutate(id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <LogSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleLogSession}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
