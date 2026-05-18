"use client";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface LifeScoreRingProps {
  score: number | null;
  loading?: boolean;
}

export function LifeScoreRing({ score, loading }: LifeScoreRingProps) {
  if (loading) return <Skeleton className="w-40 h-40 rounded-full mx-auto" />;

  const data = [{ name: "score", value: score ?? 0, fill: "hsl(var(--accent))" }];

  return (
    <div className="relative w-40 h-40 mx-auto">
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
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "hsl(var(--bg-elevated))" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{score?.toFixed(1) ?? "—"}</span>
        <span className="text-xs text-muted-foreground">Life Score</span>
      </div>
    </div>
  );
}
