"use client";
import { CheckCircle2, Loader2, Trophy, Zap, AlertTriangle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIFE_AREAS } from "@/types";
import type { AreaScores } from "./StepScores";
import { tokenColor } from "@/lib/utils/color";
import { format } from "date-fns";
import { QuoteCard } from "@/components/dashboard/QuoteCard";
import { useAuthStore } from "@/store/authStore";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { pickQuote, weakestArea } from "@/lib/quote-of-the-day";
import { lifeScore, selectedAreaKeys } from "@/lib/scoring";
import type { AreaKey } from "@/lib/areas";

interface StepReviewProps {
  scores: AreaScores;
  mood: number;
  energy: number;
  wins: string[];
  blockers: string[];
  actionPlan: string[];
  onComplete: () => void;
  isCompleting: boolean;
}

const AREA_FIELD_MAP = {
  health: "score_health",
  mind: "score_mind",
  relationships: "score_relationships",
  work: "score_work",
  money: "score_money",
  growth: "score_growth",
} as const;

// Life Score: same definition as the backend (mean of the areas picked in onboarding).
function computeOverall(scores: AreaScores, selected: AreaKey[]): number {
  const byKey = Object.fromEntries(LIFE_AREAS.map((a) => [a.slug, scores[AREA_FIELD_MAP[a.slug]]]));
  const value = lifeScore(byKey, selected);
  return value == null ? 0 : Math.round(value * 10) / 10;
}

export function StepReview({
  scores,
  mood,
  energy,
  wins,
  blockers,
  actionPlan,
  onComplete,
  isCompleting,
}: StepReviewProps) {
  const user = useAuthStore((s) => s.user);
  const { data: dashboard } = useDashboard();
  const overall = computeOverall(scores, selectedAreaKeys(user?.preferences));
  // The day's quote, same pick as on the dashboard (stable for the day).
  const picked = user
    ? pickQuote({
        dateKey: format(new Date(), "yyyy-MM-dd"),
        userId: user.id,
        weakestArea: weakestArea(dashboard?.areas, dashboard?.selected_areas),
      })
    : null;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Review your check-in before submitting. This triggers your AI daily analysis.
      </p>

      {/* Overall score preview */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/5">
        <span className="text-sm font-semibold">Estimated Life Score</span>
        <span className="text-2xl font-bold text-accent-fg">{overall}<span className="text-sm font-normal text-muted-foreground">/10</span></span>
      </div>

      {/* Area bars */}
      <div className="space-y-2">
        {LIFE_AREAS.map((area) => {
          const field = AREA_FIELD_MAP[area.slug];
          const score = scores[field] ?? 5;
          return (
            <div key={area.slug} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{area.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-elevated">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${score * 10}%`, backgroundColor: area.color }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums w-4 text-right">{score}</span>
            </div>
          );
        })}
      </div>

      {/* Mood / energy row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-elevated/50 border border-border text-center">
          <p className="text-xs text-muted-foreground mb-1">Mood</p>
          <p className="text-lg font-bold" style={{ color: tokenColor("area-relationships-fg") }}>{mood}<span className="text-xs font-normal text-muted-foreground">/10</span></p>
        </div>
        <div className="p-3 rounded-lg bg-elevated/50 border border-border text-center">
          <p className="text-xs text-muted-foreground mb-1">Energy</p>
          <p className="text-lg font-bold" style={{ color: tokenColor("area-mind-fg") }}>{energy}<span className="text-xs font-normal text-muted-foreground">/10</span></p>
        </div>
      </div>

      {/* Wins / blockers / actions summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Wins", count: wins.length, icon: Trophy, color: tokenColor("success-fg") },
          { label: "Blockers", count: blockers.length, icon: AlertTriangle, color: tokenColor("destructive-fg") },
          { label: "Actions", count: actionPlan.length, icon: ListChecks, color: tokenColor("accent-fg") },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="p-3 rounded-lg bg-elevated/50 border border-border text-center">
            <Icon size={14} className="mx-auto mb-1" style={{ color }} />
            <p className="text-lg font-bold">{count}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {picked && <QuoteCard quote={picked.quote} forArea={picked.forArea} />}

      <Button
        className="w-full"
        size="lg"
        onClick={onComplete}
        disabled={isCompleting}
      >
        {isCompleting ? (
          <>
            <Loader2 size={16} className="animate-spin mr-2" />
            Completing…
          </>
        ) : (
          <>
            <CheckCircle2 size={16} className="mr-2" />
            Complete Check-In & Get AI Analysis
          </>
        )}
      </Button>
    </div>
  );
}
