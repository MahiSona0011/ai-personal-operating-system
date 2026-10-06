"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Activity } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/metrics/MetricCard";
import { MetricForm } from "@/components/metrics/MetricForm";
import { useMetricList, useMetricMutations } from "@/lib/hooks/useMetrics";
import { useMetricSeries } from "@/lib/hooks/useDashboard";
import { ChartCard } from "@/components/ui/chart-card";
import { LOWER_IS_BETTER, formatMetricValue } from "@/lib/metrics";
import { summarizeSeries } from "@/lib/chart-summary";
import { DEFAULT_RANGE, type RangeDays } from "@/lib/range";
import { LIFE_AREAS, METRIC_KEYS } from "@/types";
import type { Metric } from "@/types";
import type { CreateMetricData, UpdateMetricData } from "@/lib/api/metrics";
import { chartColors, gridProps, axisProps, tooltipCursor } from "@/components/charts/chart-theme";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { cn } from "@/lib/utils/cn";

import { EmptyState } from "@/components/ui/empty-state";
type PanelState =
  | { mode: "idle" }
  | { mode: "new" }
  | { mode: "edit"; metric: Metric }
  | { mode: "view"; metric: Metric };

export default function MetricsPage() {
  const [areaFilter, setAreaFilter] = useState<number | null>(null);
  const [keyFilter, setKeyFilter] = useState<string>("");
  const [panel, setPanel] = useState<PanelState>({ mode: "idle" });

  const { data: metrics, isLoading } = useMetricList({
    limit: 200,
    life_area_id: areaFilter ?? undefined,
    metric_key: keyFilter || undefined,
  });

  const [range, setRange] = useState<RangeDays>(DEFAULT_RANGE);
  const viewMetric = panel.mode === "view" || panel.mode === "edit" ? panel.metric : null;
  const { data: series, isLoading: seriesLoading } = useMetricSeries(
    { key: viewMetric?.metric_key ?? "", area_id: viewMetric?.life_area_id, days: range },
    viewMetric !== null
  );

  const { createMutation, updateMutation, deleteMutation } = useMetricMutations();

  function handleSave(data: CreateMetricData) {
    if (panel.mode === "edit") {
      const updateData: UpdateMetricData = {
        metric_date: data.metric_date,
        value_numeric: data.value_numeric,
        unit: data.unit,
      };
      updateMutation.mutate(
        { id: panel.metric.id, data: updateData },
        { onSuccess: () => setPanel({ mode: "idle" }) }
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setPanel({ mode: "idle" }) });
    }
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if ((panel.mode === "edit" || panel.mode === "view") && panel.metric.id === id) {
          setPanel({ mode: "idle" });
        }
      },
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const selectedId = panel.mode === "edit" || panel.mode === "view" ? panel.metric.id : undefined;

  const areaPresets = areaFilter ? (METRIC_KEYS[areaFilter] ?? []) : [];
  const chartData = series?.points.map((p) => ({ date: p.date, value: p.value })) ?? [];

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] overflow-hidden md:-m-6">
      {/* Left — metric list */}
      <div className="w-80 shrink-0 flex flex-col border-r border-border bg-background">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-fg-secondary" />
              <h1 className="font-semibold text-foreground">Metrics</h1>
              {metrics && (
                <span className="text-xs text-fg-secondary">{metrics.length}</span>
              )}
            </div>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setPanel({ mode: "new" })}
            >
              <Plus size={13} />
              Log
            </Button>
          </div>

          {/* Area filter */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => { setAreaFilter(null); setKeyFilter(""); }}
              className={`text-xs rounded-full px-2.5 py-0.5 border transition-colors ${
                areaFilter === null
                  ? "border-accent bg-accent/10 text-accent-fg"
                  : "border-border text-fg-secondary"
              }`}
            >
              All
            </button>
            {LIFE_AREAS.map((area) => {
              const active = areaFilter === area.id;
              return (
                <button
                  key={area.id}
                  onClick={() => {
                    setAreaFilter((prev) => (prev === area.id ? null : area.id));
                    setKeyFilter("");
                  }}
                  className={cn("text-xs rounded-full px-2.5 py-0.5 border transition-colors", active ? `${area.border} ${area.soft} ${area.text}` : "border-border text-fg-secondary")}
                >
                  {area.name}
                </button>
              );
            })}
          </div>

          {/* Metric key filter — only when area is selected */}
          {areaFilter && areaPresets.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setKeyFilter("")}
                className={`text-xs rounded-full px-2.5 py-0.5 border transition-colors ${
                  keyFilter === ""
                    ? "border-accent bg-accent/10 text-accent-fg"
                    : "border-border text-fg-secondary"
                }`}
              >
                All metrics
              </button>
              {areaPresets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setKeyFilter((prev) => (prev === p.key ? "" : p.key))}
                  className={`text-xs rounded-full px-2.5 py-0.5 border transition-colors ${
                    keyFilter === p.key
                      ? "border-accent bg-accent/10 text-accent-fg"
                      : "border-border text-fg-secondary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {isLoading && (
            <>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </>
          )}

          {!isLoading && metrics?.length === 0 && (
            <EmptyState
              icon={Activity}
              title="No readings yet"
              description="A reading is one number you track over time, like sleep hours or weight. Log a few and each gets a trend chart."
              action={{ label: "Log your first reading", onClick: () => setPanel({ mode: "new" }) }}
              className="py-10"
            />
          )}

          {metrics?.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              selected={selectedId === metric.id}
              onSelect={(m) => setPanel({ mode: "view", metric: m })}
              onEdit={(m) => setPanel({ mode: "edit", metric: m })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {/* Right — form / view */}
      <div className="flex-1 overflow-y-auto p-6">
        {panel.mode === "idle" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Activity size={40} className="text-fg-secondary/40" />
            <p className="text-sm text-fg-secondary">
              Select a reading to view its history, or log a new one
            </p>
            <Button onClick={() => setPanel({ mode: "new" })}>
              <Plus size={14} className="mr-1" /> Log reading
            </Button>
          </div>
        )}

        {(panel.mode === "new" || panel.mode === "edit") && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-sm font-semibold text-fg-secondary mb-4">
              {panel.mode === "new" ? "Log a reading" : "Edit reading"}
            </h2>
            <MetricForm
              initial={panel.mode === "edit" ? panel.metric : undefined}
              onSave={handleSave}
              onCancel={() =>
                setPanel(
                  panel.mode === "edit"
                    ? { mode: "view", metric: panel.metric }
                    : { mode: "idle" }
                )
              }
              isLoading={isSaving}
            />
          </div>
        )}

        {panel.mode === "view" && (
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            {(() => {
              const area = LIFE_AREAS.find((a) => a.id === panel.metric.life_area_id);
              const presets = METRIC_KEYS[panel.metric.life_area_id] ?? [];
              const keyLabel =
                presets.find((p) => p.key === panel.metric.metric_key)?.label ??
                panel.metric.metric_key;
              return (
                <>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-xs text-fg-secondary mb-1">
                        {format(parseISO(panel.metric.metric_date), "EEEE, MMMM d yyyy")}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h2 className="text-2xl font-bold text-foreground">
                          {panel.metric.value_numeric !== null ? panel.metric.value_numeric : "—"}
                        </h2>
                        {panel.metric.unit && (
                          <span className="text-sm text-fg-secondary">
                            {panel.metric.unit}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-fg-secondary">{keyLabel}</span>
                        {area && (
                          <span
                            className={cn("text-xs rounded-full px-2.5 py-0.5", area.soft, area.text)}
                          >
                            {area.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPanel({ mode: "edit", metric: panel.metric })}
                    >
                      Edit
                    </Button>
                  </div>

                  {/* History chart */}
                  <ChartCard
                    title={`${keyLabel} history`}
                    value={series?.latest ? `${formatMetricValue(series.latest.value)}${series.unit ? ` ${series.unit}` : ""}` : undefined}
                    delta={series?.latest ? (series.delta ?? null) : undefined}
                    invertDelta={LOWER_IS_BETTER.has(panel.metric.metric_key)}
                    deltaSuffix={series?.delta != null ? "vs previous period" : undefined}
                    range={range}
                    onRangeChange={setRange}
                    loading={seriesLoading}
                    height={200}
                    empty={
                      chartData.length === 0
                        ? {
                            icon: Activity,
                            title: "No readings in this range",
                            description: `Pick a longer range, or log more ${keyLabel.toLowerCase()} readings to see a trend.`,
                          }
                        : undefined
                    }
                  >
                    <div role="img" aria-label={summarizeSeries(keyLabel, range, chartData.map((d) => d.value))} className="h-full w-full">
                      <div aria-hidden className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey="date" {...axisProps} tickFormatter={(d: string) => format(parseISO(d), "MMM d")} interval="preserveStartEnd" minTickGap={32} />
                            <YAxis {...axisProps} domain={["auto", "auto"]} />
                            <Tooltip content={<ChartTooltip />} cursor={tooltipCursor} />
                            <Line
                              type="monotone"
                              dataKey="value"
                              name={keyLabel}
                              stroke={chartColors.score}
                              strokeWidth={2}
                              dot={{ r: 3, fill: chartColors.score }}
                              activeDot={{ r: 5 }}
                              connectNulls={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </ChartCard>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
