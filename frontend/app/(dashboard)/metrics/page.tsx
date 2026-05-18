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
import { useMetricList, useMetricHistory, useMetricMutations } from "@/lib/hooks/useMetrics";
import { LIFE_AREAS, METRIC_KEYS } from "@/types";
import type { Metric } from "@/types";
import type { CreateMetricData, UpdateMetricData } from "@/lib/api/metrics";

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

  const viewMetric = panel.mode === "view" || panel.mode === "edit" ? panel.metric : null;
  const { data: history } = useMetricHistory(
    viewMetric?.life_area_id ?? null,
    viewMetric?.metric_key ?? null
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
  const chartData = history
    ? [...history]
        .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
        .map((m) => ({
          date: format(parseISO(m.metric_date), "MMM d"),
          value: m.value_numeric,
        }))
    : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left — metric list */}
      <div className="w-80 shrink-0 flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--bg-base))]">
        {/* Header */}
        <div className="px-4 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-[hsl(var(--fg-secondary))]" />
              <h1 className="font-semibold text-[hsl(var(--fg-primary))]">Metrics</h1>
              {metrics && (
                <span className="text-xs text-[hsl(var(--fg-secondary))]">{metrics.length}</span>
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
                  ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]"
                  : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))]"
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
                  className="text-xs rounded-full px-2.5 py-0.5 border transition-colors"
                  style={
                    active
                      ? {
                          borderColor: area.color,
                          backgroundColor: `color-mix(in srgb, ${area.color} 15%, transparent)`,
                          color: area.color,
                        }
                      : {
                          borderColor: "hsl(var(--border))",
                          color: "hsl(var(--fg-secondary))",
                        }
                  }
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
                    ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))]"
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
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))]"
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
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
              <Activity size={32} className="text-[hsl(var(--fg-secondary))]" />
              <p className="text-sm text-[hsl(var(--fg-secondary))]">No readings yet</p>
              <Button variant="outline" size="sm" onClick={() => setPanel({ mode: "new" })}>
                Log your first reading
              </Button>
            </div>
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
            <Activity size={40} className="text-[hsl(var(--fg-secondary)/0.4)]" />
            <p className="text-sm text-[hsl(var(--fg-secondary))]">
              Select a reading to view its history, or log a new one
            </p>
            <Button onClick={() => setPanel({ mode: "new" })}>
              <Plus size={14} className="mr-1" /> Log reading
            </Button>
          </div>
        )}

        {(panel.mode === "new" || panel.mode === "edit") && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-sm font-semibold text-[hsl(var(--fg-secondary))] mb-4">
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
                      <p className="text-xs text-[hsl(var(--fg-secondary))] mb-1">
                        {format(parseISO(panel.metric.metric_date), "EEEE, MMMM d yyyy")}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h2 className="text-2xl font-bold text-[hsl(var(--fg-primary))]">
                          {panel.metric.value_numeric !== null ? panel.metric.value_numeric : "—"}
                        </h2>
                        {panel.metric.unit && (
                          <span className="text-sm text-[hsl(var(--fg-secondary))]">
                            {panel.metric.unit}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-[hsl(var(--fg-secondary))]">{keyLabel}</span>
                        {area && (
                          <span
                            className="text-xs rounded-full px-2.5 py-0.5"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${area.color} 15%, transparent)`,
                              color: area.color,
                            }}
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
                  {chartData.length > 1 && (
                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
                      <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] mb-4">
                        {keyLabel} history ({chartData.length} readings)
                      </p>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "hsl(var(--fg-secondary))" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "hsl(var(--fg-secondary))" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--bg-surface))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            labelStyle={{ color: "hsl(var(--fg-secondary))" }}
                            itemStyle={{ color: "hsl(var(--accent))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--accent))"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "hsl(var(--accent))" }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.length === 1 && (
                    <p className="text-xs text-[hsl(var(--fg-secondary))] mt-4">
                      Log more {keyLabel} readings to see a trend chart.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
