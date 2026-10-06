"use client";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIFE_AREAS, METRIC_KEYS } from "@/types";
import type { Metric } from "@/types";
import { SelectableCard } from "@/components/ui/selectable-card";
import { confirmDelete } from "@/lib/confirm";
import { cn } from "@/lib/utils/cn";

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
    <SelectableCard
      label={`View ${keyLabel} reading from ${format(parseISO(metric.metric_date), "MMM d, yyyy")}`}
      selected={selected}
      onSelect={() => onSelect(metric)}
      className="p-3.5"
      actions={
        <>
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`Edit ${keyLabel} reading`} onClick={() => onEdit(metric)}>
            <Pencil size={12} aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive-fg hover:text-destructive-fg"
            aria-label={`Delete ${keyLabel} reading`}
            onClick={async () => { if (await confirmDelete(`this ${keyLabel} reading`)) onDelete(metric.id); }}
          >
            <Trash2 size={12} aria-hidden />
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-fg-secondary">
          {format(parseISO(metric.metric_date), "EEE, MMM d yyyy")}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-base font-semibold text-foreground">
          {metric.value_numeric !== null ? metric.value_numeric : "—"}
        </span>
        {metric.unit && (
          <span className="text-xs text-fg-secondary">{metric.unit}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-fg-secondary">{keyLabel}</span>
        {area && (
          <span
            className={cn("text-xs rounded-full px-2 py-0.5 ml-auto", area.soft, area.text)}
          >
            {area.name}
          </span>
        )}
      </div>
    </SelectableCard>
  );
}
