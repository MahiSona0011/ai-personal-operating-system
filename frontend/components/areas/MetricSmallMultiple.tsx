"use client";
import { useMemo, useState } from "react";
import { Plus, Activity } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { ChartCard } from "@/components/ui/chart-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MetricForm } from "@/components/metrics/MetricForm";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { axisProps, gridProps, tooltipCursor } from "@/components/charts/chart-theme";
import { xTickFormatter } from "@/components/dashboard/LifeScoreTrendChart";
import { useMetricSeries } from "@/lib/hooks/useDashboard";
import { useMetricMutations } from "@/lib/hooks/useMetrics";
import { LOWER_IS_BETTER, formatMetricValue } from "@/lib/metrics";
import { summarizeSeries } from "@/lib/chart-summary";
import type { RangeDays } from "@/lib/range";

interface MetricSmallMultipleProps {
  areaId: number;
  metricKey: string;
  label: string;
  defaultUnit: string;
  range: RangeDays;
  /** Colour string for the line (the area's colour). */
  color: string;
}

/** One metric as a small chart card: latest value, change, trend, and an inline "Log value" form. */
export function MetricSmallMultiple({ areaId, metricKey, label, defaultUnit, range, color }: MetricSmallMultipleProps) {
  const reduceMotion = useReducedMotion();
  const [logging, setLogging] = useState(false);
  const { data, isLoading } = useMetricSeries({ key: metricKey, area_id: areaId, days: range });
  const { createMutation } = useMetricMutations();

  const unit = data?.unit ?? defaultUnit;
  const rows = useMemo(() => data?.points.map((p) => ({ date: p.date, value: p.value })) ?? [], [data]);
  const latest = data?.latest;

  return (
    <>
      <ChartCard
        title={label}
        value={latest ? `${formatMetricValue(latest.value)} ${unit}` : undefined}
        delta={latest ? (data?.delta ?? null) : undefined}
        invertDelta={LOWER_IS_BETTER.has(metricKey)}
        loading={isLoading}
        height={110}
        action={
          <Button size="sm" variant="outline" onClick={() => setLogging(true)} aria-label={`Log value, ${label}`}>
            <Plus size={13} className="mr-1" aria-hidden /> Log value
          </Button>
        }
        empty={
          rows.length === 0
            ? {
                icon: Activity,
                title: "No readings in this range",
                description: `Log ${label.toLowerCase()} to see its trend.`,
              }
            : undefined
        }
      >
        <div role="img" aria-label={summarizeSeries(label, range, rows.map((r) => r.value))} className="h-full w-full">
          <div aria-hidden className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: -24 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={xTickFormatter(range)} interval="preserveStartEnd" minTickGap={40} />
                <YAxis {...axisProps} width={44} domain={["auto", "auto"]} />
                <Tooltip cursor={tooltipCursor} content={<ChartTooltip valueFormatter={(v) => `${formatMetricValue(Number(v))} ${unit}`} />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={label}
                  stroke={color}
                  strokeWidth={2}
                  dot={rows.length <= 31 ? { r: 2.5, fill: color, strokeWidth: 0 } : false}
                  connectNulls={false}
                  isAnimationActive={!reduceMotion}
                  animationDuration={400}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartCard>

      <Dialog open={logging} onOpenChange={setLogging}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log {label}</DialogTitle>
          </DialogHeader>
          <MetricForm
            lockedArea={areaId}
            lockedKey={metricKey}
            isLoading={createMutation.isPending}
            onCancel={() => setLogging(false)}
            onSave={(values) =>
              createMutation.mutate(values, {
                onSuccess: () => setLogging(false),
              })
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
