"use client";
import { useId, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { LineChart as LineChartIcon } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { ChartCard } from "@/components/ui/chart-card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { axisProps, chartColors, gridProps, tooltipCursor } from "@/components/charts/chart-theme";
import { useLifeScoreTrend } from "@/lib/hooks/useDashboard";
import { summarizeSeries } from "@/lib/chart-summary";
import type { RangeDays } from "@/lib/range";

interface LifeScoreTrendChartProps {
  range: RangeDays;
  onRangeChange: (range: RangeDays) => void;
}

export function xTickFormatter(range: RangeDays) {
  return (iso: string) => {
    const d = parseISO(iso);
    return range > 90 ? format(d, "MMM") : format(d, "MMM d");
  };
}

/** The hero chart: daily Life Score as an area, with the 7-day moving average dashed on top. */
export function LifeScoreTrendChart({ range, onRangeChange }: LifeScoreTrendChartProps) {
  const gradientId = useId();
  const reduceMotion = useReducedMotion();
  const { data, isLoading, isError, refetch } = useLifeScoreTrend(range);

  const rows = useMemo(
    () =>
      (data?.points ?? []).map((p, i) => ({
        date: p.date,
        score: p.life_score,
        avg: data?.moving_avg_7[i]?.value ?? null,
      })),
    [data]
  );
  const hasData = rows.some((r) => r.score != null);
  const sparse = rows.filter((r) => r.score != null).length <= 12 || range <= 30;

  return (
    <ChartCard
      title="Life Score trend"
      range={range}
      onRangeChange={onRangeChange}
      loading={isLoading}
      height={260}
      empty={
        isError
          ? {
              icon: LineChartIcon,
              title: "Couldn't load your trend",
              description: "Check your connection and try again.",
              action: { label: "Retry", onClick: () => refetch() },
            }
          : !hasData
            ? {
                icon: LineChartIcon,
                title: "Your trend starts with one check-in",
                description: "Rate your six areas once a day and this chart will show how your Life Score moves.",
                action: { label: "Start a check-in", href: "/checkin" },
              }
            : undefined
      }
    >
      <div
        role="img"
        aria-label={summarizeSeries("Life score", range, rows.map((r) => r.score))}
        className="h-full w-full"
      >
        <div aria-hidden className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.score} stopOpacity={0.12} />
                <stop offset="100%" stopColor={chartColors.score} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="date"
              {...axisProps}
              tickFormatter={xTickFormatter(range)}
              interval="preserveStartEnd"
              minTickGap={32}
            />
            <YAxis domain={[0, 10]} ticks={[0, 2.5, 5, 7.5, 10]} {...axisProps} width={44} />
            <Tooltip
              cursor={tooltipCursor}
              content={<ChartTooltip valueFormatter={(v) => Number(v).toFixed(1)} />}
            />
            <Area
              type="monotone"
              dataKey="score"
              name="Life Score"
              stroke={chartColors.score}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              connectNulls={false}
              dot={sparse ? { r: 2.5, fill: chartColors.score, strokeWidth: 0 } : false}
              activeDot={{ r: 4 }}
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
          </ComposedChart>
        </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
