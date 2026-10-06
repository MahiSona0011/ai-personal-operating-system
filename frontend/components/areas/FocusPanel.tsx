"use client";
import { useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Clock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { ChartCard } from "@/components/ui/chart-card";
import { StatTile } from "@/components/ui/stat-tile";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { axisProps, chartColors, gridProps } from "@/components/charts/chart-theme";
import { useSessionStats } from "@/lib/hooks/useSessions";
import type { RangeDays } from "@/lib/range";

function hours(minutes: number): string {
  return `${(minutes / 60).toFixed(1).replace(/\.0$/, "")} h`;
}

/** The Focus signal on the Work page: deep-work time by week and how good those sessions were. */
export function FocusPanel({ range, color }: { range: RangeDays; color: string }) {
  const reduceMotion = useReducedMotion();
  const days = Math.max(range, 28);
  const { data, isLoading } = useSessionStats(days, { session_type: "deep_work" });
  const rows = useMemo(
    () => (data?.by_week ?? []).map((w) => ({ date: w.week_start, minutes: w.minutes })),
    [data]
  );

  return (
    <ChartCard
      title="Focus"
      loading={isLoading}
      height={170}
      action={
        <Link href="/learning" className="text-xs font-medium text-accent-fg hover:underline">
          All sessions
        </Link>
      }
      empty={
        rows.length === 0
          ? {
              icon: Clock,
              title: "No deep-work sessions yet",
              description: "Log a focused block and you'll see your deep-work time by week and how well each session went.",
              action: { label: "Log a session", href: "/learning" },
            }
          : undefined
      }
    >
      <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
        <div className="flex gap-2 sm:flex-col">
          <StatTile label="Deep work" value={hours(data?.total_minutes ?? 0)} className="flex-1" />
          <StatTile
            label="Avg quality"
            value={data?.avg_quality != null ? data.avg_quality.toFixed(1) : "—"}
            unit={data?.avg_quality != null ? "/ 5" : undefined}
            className="flex-1"
          />
        </div>
        <div
          role="img"
          aria-label={`Deep work minutes per week over the last ${days} days: ${rows.map((r) => r.minutes).join(", ")}`}
          className="h-full min-h-[8rem]"
        >
          <div aria-hidden className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={(d: string) => format(parseISO(d), "MMM d")} />
                <YAxis {...axisProps} width={44} />
                <Tooltip
                  cursor={{ fill: chartColors.grid }}
                  content={
                    <ChartTooltip
                      labelFormatter={(l) => `Week of ${format(parseISO(String(l)), "MMM d")}`}
                      valueFormatter={(v) => `${v} min`}
                    />
                  }
                />
                <Bar dataKey="minutes" name="Deep work" fill={color} radius={[3, 3, 0, 0]} isAnimationActive={!reduceMotion} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
