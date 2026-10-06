"use client";
import { PolarAngleAxis, RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { chartColors } from "@/components/charts/chart-theme";

interface LifeScoreRingProps {
  score: number | null;
  loading?: boolean;
  /** Small caption under the number. */
  caption?: string;
}

export function LifeScoreRing({ score, loading, caption = "Life Score" }: LifeScoreRingProps) {
  if (loading) return <Skeleton className="w-40 h-40 rounded-full mx-auto" />;

  const data = [{ name: "score", value: score ?? 0, fill: chartColors.score }];

  return (
    <div
      className="relative w-40 h-40 mx-auto"
      role="img"
      aria-label={score == null ? "Life Score: no data yet" : `Life Score ${score.toFixed(1)} out of 10`}
    >
      <div aria-hidden className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          {/* Fix the scale to 0-10, otherwise the ring is always full. */}
          <PolarAngleAxis type="number" domain={[0, 10]} tick={false} axisLine={false} />
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: chartColors.trackBg }} />
        </RadialBarChart>
      </ResponsiveContainer>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums text-foreground">{score?.toFixed(1) ?? "—"}</span>
        <span className="text-xs text-fg-secondary">{caption}</span>
      </div>
    </div>
  );
}
