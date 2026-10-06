"use client";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { chartColors } from "@/components/charts/chart-theme";

export interface SparklineProps {
  /** Series values; `null` leaves a gap (a day with no data). */
  data: (number | null)[];
  color?: string;
  height?: number;
  className?: string;
  label?: string;
}

/** Tiny trend line: no axes, no tooltip, 32px tall by default. */
export function Sparkline({ data, color = chartColors.score, height = 32, className, label }: SparklineProps) {
  const points = data.map((v, i) => ({ i, v }));
  const hasData = data.some((v) => v != null);
  return (
    <div
      className={className}
      style={{ height }}
      role="img"
      aria-label={label ?? (hasData ? "Trend over the period" : "No data for this period")}
    >
      {hasData && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.75}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
