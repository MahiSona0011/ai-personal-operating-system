"use client";
import { format, parseISO } from "date-fns";
import { RefreshCw } from "lucide-react";
import { SelectableCard } from "@/components/ui/selectable-card";
import type { WeeklyReview } from "@/types";

const STATUS_STYLES: Record<
  string,
  { label: string; class: string; spin?: boolean }
> = {
  pending:     { label: "Pending",     class: "bg-fg-secondary/[0.12] text-fg-secondary" },
  in_progress: { label: "Generating",  class: "bg-accent/10 text-accent-fg", spin: true },
  completed:   { label: "Done",        class: "bg-accent/[0.12] text-accent-fg" },
  failed:      { label: "Failed",      class: "bg-destructive/[0.12] text-destructive-fg" },
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
    <SelectableCard
      label={`Open weekly review for ${format(parseISO(review.week_start_date), "MMM d")} to ${format(parseISO(review.week_end_date), "MMM d, yyyy")}`}
      selected={selected}
      onSelect={() => onSelect(review)}
      className="p-3.5"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground">
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
        <div className="flex items-center gap-3 text-xs text-fg-secondary">
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
    </SelectableCard>
  );
}
