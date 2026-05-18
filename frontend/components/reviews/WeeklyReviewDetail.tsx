"use client";
import { format, parseISO } from "date-fns";
import { RefreshCw, CheckCircle2, ArrowRight, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { LIFE_AREAS } from "@/types";
import type { WeeklyReview } from "@/types";

interface WeeklyReviewDetailProps {
  review: WeeklyReview;
  onRegenerate: (weekStart: string) => void;
  isRegenerating?: boolean;
}

export function WeeklyReviewDetail({ review, onRegenerate, isRegenerating }: WeeklyReviewDetailProps) {
  const scores = Object.values(review.avg_scores ?? {}) as number[];
  const avgScore =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

  const radarData = LIFE_AREAS
    .filter((area) => review.avg_scores?.[area.slug] !== undefined)
    .map((area) => ({ area: area.name, score: Number(review.avg_scores[area.slug] ?? 0) }));

  const isPending = review.generation_status === "pending" || review.generation_status === "in_progress";
  const isFailed  = review.generation_status === "failed";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[hsl(var(--fg-secondary))] mb-0.5">Week of</p>
          <h2 className="text-xl font-bold text-[hsl(var(--fg-primary))]">
            {format(parseISO(review.week_start_date), "MMMM d")}
            {" – "}
            {format(parseISO(review.week_end_date), "MMMM d, yyyy")}
          </h2>
        </div>
        {isFailed && (
          <Button
            size="sm"
            variant="outline"
            disabled={isRegenerating}
            onClick={() => onRegenerate(review.week_start_date)}
          >
            {isRegenerating ? (
              <RefreshCw size={13} className="mr-1.5 animate-spin" />
            ) : (
              <RefreshCw size={13} className="mr-1.5" />
            )}
            Retry
          </Button>
        )}
      </div>

      {/* Generating state */}
      {isPending && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]">
          <RefreshCw size={28} className="animate-spin text-[hsl(var(--accent))]" />
          <p className="text-sm font-medium text-[hsl(var(--fg-primary))]">Generating your weekly review…</p>
          <p className="text-xs text-[hsl(var(--fg-secondary))]">This takes about 10–15 seconds. The page will update automatically.</p>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="rounded-xl border border-[hsl(var(--area-health)/0.4)] bg-[hsl(var(--area-health)/0.06)] p-4 text-sm text-[hsl(var(--area-health))]">
          Generation failed. Click Retry to try again.
        </div>
      )}

      {/* Completed content */}
      {review.generation_status === "completed" && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {avgScore && (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-3 text-center">
                <p className="text-2xl font-bold text-[hsl(var(--fg-primary))]">{avgScore}</p>
                <p className="text-xs text-[hsl(var(--fg-secondary))] mt-0.5">Avg score / 10</p>
              </div>
            )}
            {review.habit_completion_rate !== null && (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-3 text-center">
                <p className="text-2xl font-bold text-[hsl(var(--fg-primary))]">
                  {Math.round(Number(review.habit_completion_rate))}%
                </p>
                <p className="text-xs text-[hsl(var(--fg-secondary))] mt-0.5">Habit completion</p>
              </div>
            )}
            {review.total_session_minutes !== null && (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-3 text-center">
                <p className="text-2xl font-bold text-[hsl(var(--fg-primary))]">
                  {Math.floor(review.total_session_minutes / 60)}h {review.total_session_minutes % 60}m
                </p>
                <p className="text-xs text-[hsl(var(--fg-secondary))] mt-0.5">Work sessions</p>
              </div>
            )}
          </div>

          {/* Radar chart */}
          {radarData.length > 0 && (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} className="text-[hsl(var(--fg-secondary))]" />
                <p className="text-xs font-medium text-[hsl(var(--fg-secondary))]">Life area scores</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="area"
                    tick={{ fontSize: 11, fill: "hsl(var(--fg-secondary))" }}
                  />
                  <Radar
                    dataKey="score"
                    fill="hsl(var(--accent))"
                    fillOpacity={0.25}
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--bg-surface))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}/10`, "Score"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI narrative */}
          {review.ai_narrative && (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
              <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] uppercase tracking-wide mb-3">
                AI narrative
              </p>
              <p className="text-sm text-[hsl(var(--fg-primary))] leading-relaxed">
                {review.ai_narrative}
              </p>
            </div>
          )}

          {/* Highlights + improvement areas */}
          {((review.highlights ?? []).length > 0 || (review.improvement_areas ?? []).length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {(review.highlights ?? []).length > 0 && (
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
                  <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] uppercase tracking-wide mb-3">
                    Highlights
                  </p>
                  <ul className="flex flex-col gap-2">
                    {review.highlights!.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-[hsl(var(--accent))]" />
                        <span className="text-xs text-[hsl(var(--fg-primary))]">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(review.improvement_areas ?? []).length > 0 && (
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
                  <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] uppercase tracking-wide mb-3">
                    Needs work
                  </p>
                  <ul className="flex flex-col gap-2">
                    {review.improvement_areas!.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight size={13} className="shrink-0 mt-0.5 text-[hsl(var(--fg-secondary))]" />
                        <span className="text-xs text-[hsl(var(--fg-secondary))]">{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
