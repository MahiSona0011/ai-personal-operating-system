"use client";
import { useMemo } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { ChartCard } from "@/components/ui/chart-card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { axisProps, chartColors, gridProps, tooltipCursor } from "@/components/charts/chart-theme";
import { xTickFormatter } from "@/components/dashboard/LifeScoreTrendChart";
import { summarizeSeries } from "@/lib/chart-summary";
import { movingAverage } from "@/lib/stats";
import type { RangeDays } from "@/lib/range";

interface AreaScoreChartProps {
  areaName: string;
  /** One point per day; null on days without a check-in. */
  series: { date: string; score: number | null }[] | undefined;
  range: RangeDays;
  /** Colour string for the line (the area's colour). */
  color: string;
  loading?: boolean;
}

/** An area's daily score as a line in the area colour with the 7-day average dashed. */
export function AreaScoreChart({ areaName, series, range, color, loading }: AreaScoreChartProps) {
  const reduceMotion = useReducedMotion();
  const rows = useMemo(() => {
    const ma = movingAverage((series ?? []).map((p) => p.score), 7);
    return (series ?? []).map((p, i) => ({ date: p.date, score: p.score, avg: ma[i] }));
  }, [series]);
  const hasData = rows.some((r) => r.score != null);

  return (
    <ChartCard
      title={`${areaName} score`}
      loading={loading}
      height={220}
      empty={
        hasData
          ? undefined
          : {
              icon: LineChartIcon,
              title: `No ${areaName} scores in this range`,
              description: `Your daily check-in rates ${areaName}. Check in to start the trend.`,
              action: { label: "Start a check-in", href: "/checkin" },
            }
      }
    >
      <div role="img" aria-label={summarizeSeries(`${areaName} score`, range, rows.map((r) => r.score))} className="h-full w-full">
        <div aria-hidden className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...axisProps} tickFormatter={xTickFormatter(range)} interval="preserveStartEnd" minTickGap={32} />
              <YAxis domain={[0, 10]} ticks={[0, 2.5, 5, 7.5, 10]} {...axisProps} width={44} />
              <Tooltip cursor={tooltipCursor} content={<ChartTooltip valueFormatter={(v) => Number(v).toFixed(1)} />} />
              <Line
                type="monotone"
                dataKey="score"
                name={`${areaName} score`}
                stroke={color}
                strokeWidth={2}
                dot={range <= 30 ? { r: 2.5, fill: color, strokeWidth: 0 } : false}
                connectNulls={false}
                isAnimationActive={!reduceMotion}
                animationDuration={500}
              />
              <Line
                type="monotone"
                dataKey="avg"
                name="7-day average"
                stroke={chartColors.axis}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
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
