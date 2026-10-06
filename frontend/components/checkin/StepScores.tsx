"use client";
import { Slider } from "@/components/ui/slider";
import { LIFE_AREAS } from "@/types";
import { cn } from "@/lib/utils/cn";

type ScoreKey =
  | "score_health"
  | "score_mind"
  | "score_relationships"
  | "score_work"
  | "score_money"
  | "score_growth";

const AREA_FIELD_MAP: Record<string, ScoreKey> = {
  health: "score_health",
  mind: "score_mind",
  relationships: "score_relationships",
  work: "score_work",
  money: "score_money",
  growth: "score_growth",
};

export type AreaScores = Record<ScoreKey, number>;

interface StepScoresProps {
  scores: AreaScores;
  onChange: (scores: AreaScores) => void;
}

export function StepScores({ scores, onChange }: StepScoresProps) {
  const handleChange = (slug: string, value: number) => {
    const field = AREA_FIELD_MAP[slug];
    onChange({ ...scores, [field]: value });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rate each area of your life from 1 (struggling) to 10 (thriving).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {LIFE_AREAS.map((area) => {
          const field = AREA_FIELD_MAP[area.slug];
          const value = scores[field] ?? 5;
          return (
            <div key={area.slug} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("w-2.5 h-2.5 rounded-full shrink-0", area.dot)}
                  />
                  <span className="text-sm font-medium">{area.name}</span>
                </div>
                <span
                  className={cn("text-sm font-bold tabular-nums w-5 text-right", area.text)}
                >
                  {value}
                </span>
              </div>
              <Slider
                value={value}
                onChange={(v) => handleChange(area.slug, v)}
                min={1}
                max={10}
                color={area.color}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground select-none">
                <span>Struggling</span>
                <span>Thriving</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
