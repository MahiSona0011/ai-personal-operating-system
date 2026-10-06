"use client";
import { useMemo } from "react";
import { Smile } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { ChartCard } from "@/components/ui/chart-card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { axisProps, chartColors, gridProps, tooltipCursor } from "@/components/charts/chart-theme";
import { xTickFormatter } from "@/components/dashboard/LifeScoreTrendChart";
import { useLifeScoreTrend } from "@/lib/hooks/useDashboard";
import { summarizeSeries } from "@/lib/chart-summary";
import type { RangeDays } from "@/lib/range";

/** Mood and energy (both rated 1-10) over the same range as the Life Score chart above it. */
export function MoodEnergyChart({ range }: { range: RangeDays }) {
  const reduceMotion = useReducedMotion();
  const { data, isLoading } = useLifeScoreTrend(range);
  const rows = useMemo(() => data?.points.map((p) => ({ date: p.date, mood: p.mood, energy: p.energy })) ?? [], [data]);
  const hasData = rows.some((r) => r.mood != null || r.energy != null);
  const sparse = range <= 30;

  return (
    <ChartCard
      title="Mood & energy"
      loading={isLoading}
      height={200}
      empty={
        hasData
          ? undefined
          : {
              icon: Smile,
              title: "No mood or energy yet",
              description: "Step 2 of the daily check-in records both, so you can spot what lifts or drains you.",
              action: { label: "Start a check-in", href: "/checkin" },
            }
      }
    >
      <div
        role="img"
        aria-label={`${summarizeSeries("Mood", range, rows.map((r) => r.mood))}. ${summarizeSeries("Energy", range, rows.map((r) => r.energy))}`}
        className="h-full w-full"
      >
        <div aria-hidden className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} tickFormatter={xTickFormatter(range)} interval="preserveStartEnd" minTickGap={32} />
            <YAxis domain={[1, 10]} ticks={[1, 3, 5, 7, 10]} {...axisProps} width={44} />
            <Tooltip cursor={tooltipCursor} content={<ChartTooltip valueFormatter={(v) => `${v} / 10`} />} />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="mood"
              name="Mood"
              stroke={chartColors.mood}
              strokeWidth={2}
              dot={sparse ? { r: 2, strokeWidth: 0, fill: chartColors.mood } : false}
              connectNulls={false}
              isAnimationActive={!reduceMotion}
              animationDuration={500}
            />
            <Line
              type="monotone"
              dataKey="energy"
              name="Energy"
              stroke={chartColors.energy}
              strokeWidth={2}
              dot={sparse ? { r: 2, strokeWidth: 0, fill: chartColors.energy } : false}
              connectNulls={false}
              isAnimationActive={!reduceMotion}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
