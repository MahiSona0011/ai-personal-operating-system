"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LIFE_AREAS } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

interface AreaScore {
  today: number | null;
  week_avg: number | null;
  trend: "up" | "down" | "stable";
}

interface AreaScoreGridProps {
  scores: Record<string, AreaScore> | undefined;
  loading?: boolean;
}

export function AreaScoreGrid({ scores, loading }: AreaScoreGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3">
      {LIFE_AREAS.map((area) => {
        const data = scores?.[area.slug];
        const TrendIcon = data?.trend === "up" ? TrendingUp : data?.trend === "down" ? TrendingDown : Minus;
        return (
          <div
            key={area.slug}
            className="bg-elevated rounded-lg p-3 flex flex-col gap-1"
            style={{ borderLeft: `3px solid ${area.color}` }}
          >
            <span className="text-xs text-muted-foreground truncate">{area.name}</span>
            <span className="text-xl font-bold">{data?.today ?? "—"}</span>
            <div className={cn(
              "flex items-center gap-1 text-xs",
              data?.trend === "up" ? "text-success" : data?.trend === "down" ? "text-destructive" : "text-muted-foreground"
            )}>
              <TrendIcon size={10} />
              <span>{data?.week_avg != null ? `${data.week_avg} avg` : "no data"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
