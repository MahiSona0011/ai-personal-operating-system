"use client";
import { format, parseISO } from "date-fns";
import { RefreshCw } from "lucide-react";
import type { WeeklyReview } from "@/types";

const STATUS_STYLES: Record<
  string,
  { label: string; class: string; spin?: boolean }
> = {
  pending:     { label: "Pending",     class: "bg-[hsl(var(--fg-secondary)/0.12)] text-[hsl(var(--fg-secondary))]" },
  in_progress: { label: "Generating",  class: "bg-[hsl(var(--area-learning)/0.12)] text-[hsl(var(--area-learning))]", spin: true },
  completed:   { label: "Done",        class: "bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]" },
  failed:      { label: "Failed",      class: "bg-[hsl(var(--area-health)/0.12)] text-[hsl(var(--area-health))]" },
};

interface WeeklyReviewCardProps {
  review: WeeklyReview;
  selected?: boolean;
  onSelect: (review: WeeklyReview) => void;
}

export function WeeklyReviewCard({ review, selected, onSelect }: WeeklyReviewCardProps) {
  const status = STATUS_STYLES[review.generation_status] ?? STATUS_STYLES.pending;
  const scores = Object.values(review.avg_scores ?? {}) as number[];
  const avgScore =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(review)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(review)}
      className={`group rounded-xl border p-3.5 cursor-pointer transition-colors ${
        selected
          ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.06)]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] hover:border-[hsl(var(--accent)/0.4)]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[hsl(var(--fg-primary))]">
          {format(parseISO(review.week_start_date), "MMM d")}
          {" – "}
          {format(parseISO(review.week_end_date), "MMM d, yyyy")}
        </span>
        <span className={`flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 ${status.class}`}>
          {status.spin && <RefreshCw size={9} className="animate-spin" />}
          {status.label}
        </span>
      </div>

      {review.generation_status === "completed" && (
        <div className="flex items-center gap-3 text-xs text-[hsl(var(--fg-secondary))]">
          {avgScore && <span>{avgScore}/10 avg</span>}
          {review.habit_completion_rate !== null && (
            <span>{Math.round(Number(review.habit_completion_rate))}% habits</span>
          )}
          {review.total_session_minutes !== null && (
            <span>
              {Math.floor(review.total_session_minutes / 60)}h{" "}
              {review.total_session_minutes % 60}m sessions
            </span>
          )}
        </div>
      )}
    </div>
  );
}
