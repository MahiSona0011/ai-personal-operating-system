"use client";
import { useState } from "react";
import { format, startOfWeek, parseISO } from "date-fns";
import { Brain, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightCard } from "@/components/analysis/InsightCard";
import { OnDemandPanel } from "@/components/analysis/OnDemandPanel";
import { useRecommendations, useWeeklyReviews, useAnalysisMutations } from "@/lib/hooks/useAnalysis";
import type { AIRecommendation } from "@/types";
import { tokenColor } from "@/lib/utils/color";

import { EmptyState } from "@/components/ui/empty-state";
export default function AnalysisPage() {
  const { data: recs, isLoading: recsLoading } = useRecommendations({ limit: 20 });
  const { data: weeklies, isLoading: weekliesLoading } = useWeeklyReviews();
  const {
    onDemandMutation,
    dismissMutation,
    rateMutation,
    generateWeeklyMutation,
  } = useAnalysisMutations();

  const [onDemandResult, setOnDemandResult] = useState<AIRecommendation | null>(null);

  function handleOnDemand(question: string, contextAreas: string[]) {
    onDemandMutation.mutate(
      { question, context_areas: contextAreas },
      { onSuccess: (data) => setOnDemandResult(data) },
    );
  }

  const thisWeekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );

  const latestWeekly = weeklies?.[0];
  const hasThisWeek = weeklies?.some((w) => w.week_start_date === thisWeekStart);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Analysis</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Powered by Claude · {recs?.length ?? 0} insights
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={generateWeeklyMutation.isPending || hasThisWeek}
          onClick={() => generateWeeklyMutation.mutate(thisWeekStart)}
        >
          <Calendar size={14} className="mr-1" />
          {hasThisWeek ? "Weekly generated" : "Generate weekly review"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ask panel + weekly review */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <OnDemandPanel
            onSubmit={handleOnDemand}
            isLoading={onDemandMutation.isPending}
            result={onDemandResult}
          />

          {/* Latest weekly review */}
          {!weekliesLoading && latestWeekly && latestWeekly.generation_status === "completed" && (
            <div className="rounded-xl border border-border border-t-2 border-t-accent bg-surface p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-accent-fg" />
                <span className="text-xs font-medium text-accent-fg">Weekly Review</span>
                <span className="text-xs text-fg-secondary ml-auto">
                  w/o {format(parseISO(latestWeekly.week_start_date), "MMM d")}
                </span>
              </div>
              {latestWeekly.ai_narrative && (
                <p className="text-sm text-foreground leading-relaxed line-clamp-6">
                  {latestWeekly.ai_narrative}
                </p>
              )}
              {latestWeekly.highlights && latestWeekly.highlights.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-fg-secondary mb-1 uppercase tracking-wide">Highlights</p>
                  {latestWeekly.highlights.map((h, i) => (
                    <p key={i} className="text-xs text-foreground">✓ {h}</p>
                  ))}
                </div>
              )}
              {latestWeekly.improvement_areas && latestWeekly.improvement_areas.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-fg-secondary mb-1 uppercase tracking-wide">Needs work</p>
                  {latestWeekly.improvement_areas.map((a, i) => (
                    <p key={i} className="text-xs text-fg-secondary">→ {a}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {!weekliesLoading && latestWeekly && latestWeekly.generation_status === "in_progress" && (
            <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
              <RefreshCw size={14} className="animate-spin text-fg-secondary" />
              <p className="text-sm text-fg-secondary">Generating weekly review…</p>
            </div>
          )}
        </div>

        {/* Right: Insight feed */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wider">
            Recent Insights
          </h2>

          {recsLoading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          )}

          {!recsLoading && (!recs || recs.length === 0) && (
            <EmptyState
              icon={Brain}
              title="No insights yet"
              description="Each completed daily check-in is analysed for patterns and a concrete next step. They collect here."
              action={{ label: "Start a check-in", href: "/checkin" }}
              className="py-16"
            />
          )}

          {!recsLoading && recs && recs.length > 0 && (
            <div className="flex flex-col gap-4">
              {recs.map((rec) => (
                <InsightCard
                  key={rec.id}
                  rec={rec}
                  onDismiss={(id) => dismissMutation.mutate(id)}
                  onRate={(id, rating) => rateMutation.mutate({ id, rating })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
