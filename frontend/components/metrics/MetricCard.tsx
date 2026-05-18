"use client";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIFE_AREAS, METRIC_KEYS } from "@/types";
import type { Metric } from "@/types";

interface MetricCardProps {
  metric: Metric;
  selected?: boolean;
  onSelect: (metric: Metric) => void;
  onEdit: (metric: Metric) => void;
  onDelete: (id: number) => void;
}

export function MetricCard({ metric, selected, onSelect, onEdit, onDelete }: MetricCardProps) {
  const area = LIFE_AREAS.find((a) => a.id === metric.life_area_id);
  const presets = METRIC_KEYS[metric.life_area_id] ?? [];
  const keyLabel =
    presets.find((p) => p.key === metric.metric_key)?.label ?? metric.metric_key;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(metric)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(metric)}
      className={`group rounded-xl border p-3.5 cursor-pointer transition-colors ${
        selected
          ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.06)]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] hover:border-[hsl(var(--accent)/0.4)]"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-[hsl(var(--fg-secondary))]">
          {format(parseISO(metric.metric_date), "EEE, MMM d yyyy")}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onEdit(metric); }}
          >
            <Pencil size={12} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-[hsl(var(--area-health))] hover:text-[hsl(var(--area-health))]"
            onClick={(e) => { e.stopPropagation(); onDelete(metric.id); }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-base font-semibold text-[hsl(var(--fg-primary))]">
          {metric.value_numeric !== null ? metric.value_numeric : "—"}
        </span>
        {metric.unit && (
          <span className="text-xs text-[hsl(var(--fg-secondary))]">{metric.unit}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[hsl(var(--fg-secondary))]">{keyLabel}</span>
        {area && (
          <span
            className="text-xs rounded-full px-2 py-0.5 ml-auto"
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
  );
}
