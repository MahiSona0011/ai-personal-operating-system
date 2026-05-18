"use client";
import { CheckCircle2, Loader2, Trophy, Zap, AlertTriangle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIFE_AREAS } from "@/types";
import type { AreaScores } from "./StepScores";

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
  discipline: "score_discipline",
  focus: "score_focus",
  learning: "score_learning",
  career: "score_career",
  health: "score_health",
  mental: "score_mental",
  social: "score_social",
  financial: "score_financial",
} as const;

const WEIGHTS: Record<string, number> = {
  discipline: 0.15,
  focus: 0.15,
  learning: 0.12,
  career: 0.13,
  health: 0.15,
  mental: 0.13,
  social: 0.09,
  financial: 0.08,
};

function computeOverall(scores: AreaScores): number {
  let total = 0;
  let weightSum = 0;
  for (const area of LIFE_AREAS) {
    const field = AREA_FIELD_MAP[area.slug];
    const score = scores[field];
    if (score != null) {
      total += score * WEIGHTS[area.slug];
      weightSum += WEIGHTS[area.slug];
    }
  }
  return weightSum > 0 ? Math.round((total / weightSum) * 10) / 10 : 0;
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
  const overall = computeOverall(scores);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Review your check-in before submitting. This triggers your AI daily analysis.
      </p>

      {/* Overall score preview */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/5">
        <span className="text-sm font-semibold">Estimated Overall Score</span>
        <span className="text-2xl font-bold text-accent">{overall}<span className="text-sm font-normal text-muted-foreground">/10</span></span>
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
          <p className="text-lg font-bold" style={{ color: "hsl(330 81% 60%)" }}>{mood}<span className="text-xs font-normal text-muted-foreground">/10</span></p>
        </div>
        <div className="p-3 rounded-lg bg-elevated/50 border border-border text-center">
          <p className="text-xs text-muted-foreground mb-1">Energy</p>
          <p className="text-lg font-bold" style={{ color: "hsl(38 92% 50%)" }}>{energy}<span className="text-xs font-normal text-muted-foreground">/10</span></p>
        </div>
      </div>

      {/* Wins / blockers / actions summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Wins", count: wins.length, icon: Trophy, color: "hsl(142 71% 45%)" },
          { label: "Blockers", count: blockers.length, icon: AlertTriangle, color: "hsl(0 84% 60%)" },
          { label: "Actions", count: actionPlan.length, icon: ListChecks, color: "hsl(250 84% 67%)" },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="p-3 rounded-lg bg-elevated/50 border border-border text-center">
            <Icon size={14} className="mx-auto mb-1" style={{ color }} />
            <p className="text-lg font-bold">{count}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

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
