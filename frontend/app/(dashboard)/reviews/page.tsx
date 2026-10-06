"use client";
import { useState } from "react";
import { format, startOfWeek, parseISO } from "date-fns";
import { CalendarCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyReviewCard } from "@/components/reviews/WeeklyReviewCard";
import { WeeklyReviewDetail } from "@/components/reviews/WeeklyReviewDetail";
import { useWeeklyReviews, useAnalysisMutations } from "@/lib/hooks/useAnalysis";
import type { WeeklyReview } from "@/types";

import { EmptyState } from "@/components/ui/empty-state";
export default function ReviewsPage() {
  const thisMonday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const [pickedDate, setPickedDate] = useState(thisMonday);
  const [selected, setSelected] = useState<WeeklyReview | null>(null);

  const { data: reviews, isLoading } = useWeeklyReviews();
  const { generateWeeklyMutation } = useAnalysisMutations();

  const pickedMonday = format(
    startOfWeek(parseISO(pickedDate), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const alreadyExists = reviews?.some((r) => r.week_start_date === pickedMonday);
  const existingIsFailed = reviews?.find((r) => r.week_start_date === pickedMonday)?.generation_status === "failed";
  const canGenerate = !alreadyExists || existingIsFailed;

  function handleGenerate() {
    generateWeeklyMutation.mutate(pickedMonday, {
      onSuccess: (review) => setSelected(review),
    });
  }

  function handleRegenerate(weekStart: string) {
    generateWeeklyMutation.mutate(weekStart, {
      onSuccess: (review) => setSelected(review),
    });
  }

  // Keep selected in sync with latest data (status changes as generation completes)
  const liveSelected = selected
    ? (reviews?.find((r) => r.id === selected.id) ?? selected)
    : null;

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] overflow-hidden md:-m-6">
      {/* Left — review list */}
      <div className="w-80 shrink-0 flex flex-col border-r border-border bg-background">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck size={18} className="text-fg-secondary" />
            <h1 className="font-semibold text-foreground">Weekly Reviews</h1>
            {reviews && (
              <span className="text-xs text-fg-secondary">{reviews.length}</span>
            )}
          </div>

          {/* Week picker + generate */}
          <div className="flex gap-2">
            <input
              type="date"
              aria-label="Week to review"
              value={pickedDate}
              onChange={(e) => setPickedDate(e.target.value)}
              className="flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button
              size="sm"
              className="h-8 text-xs gap-1 shrink-0"
              disabled={!canGenerate || generateWeeklyMutation.isPending}
              onClick={handleGenerate}
            >
              <Plus size={12} />
              {alreadyExists && !existingIsFailed ? "Generated" : "Generate"}
            </Button>
          </div>
          {pickedMonday !== pickedDate && (
            <p className="text-[10px] text-fg-secondary mt-1">
              Snapped to Monday {format(parseISO(pickedMonday), "MMM d")}
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {isLoading && (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </>
          )}

          {!isLoading && (!reviews || reviews.length === 0) && (
            <EmptyState
              icon={CalendarCheck}
              title="No weekly reviews yet"
              description="A review summarises your week: scores, habits, wins and one thing to change. Pick a week above and generate it."
              className="py-10"
            />
          )}

          {reviews?.map((review) => (
            <WeeklyReviewCard
              key={review.id}
              review={review}
              selected={liveSelected?.id === review.id}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {/* Right — detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!liveSelected && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <CalendarCheck size={40} className="text-fg-secondary/40" />
            <p className="text-sm text-fg-secondary">
              Select a week to view the full review
            </p>
          </div>
        )}

        {liveSelected && (
          <div className="max-w-2xl mx-auto">
            <WeeklyReviewDetail
              review={liveSelected}
              onRegenerate={handleRegenerate}
              isRegenerating={generateWeeklyMutation.isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}
