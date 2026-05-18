"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIFE_AREAS, METRIC_KEYS } from "@/types";
import type { Metric } from "@/types";

interface MetricFormProps {
  initial?: Metric;
  onSave: (data: {
    life_area_id: number;
    metric_key: string;
    metric_date: string;
    value_numeric?: number;
    unit?: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CUSTOM_KEY = "__custom__";

export function MetricForm({ initial, onSave, onCancel, isLoading }: MetricFormProps) {
  const [areaId, setAreaId] = useState<number>(initial?.life_area_id ?? LIFE_AREAS[0].id);
  const [selectedKey, setSelectedKey] = useState<string>(
    initial?.metric_key ?? METRIC_KEYS[LIFE_AREAS[0].id]?.[0]?.key ?? ""
  );
  const [customKey, setCustomKey] = useState("");
  const [metricDate, setMetricDate] = useState(
    initial?.metric_date ?? format(new Date(), "yyyy-MM-dd")
  );
  const [value, setValue] = useState<string>(
    initial?.value_numeric !== null && initial?.value_numeric !== undefined
      ? String(initial.value_numeric)
      : ""
  );
  const [unit, setUnit] = useState(initial?.unit ?? "");

  const presets = METRIC_KEYS[areaId] ?? [];
  const isCustom = selectedKey === CUSTOM_KEY;
  const finalKey = isCustom ? customKey.trim() : selectedKey;

  useEffect(() => {
    if (initial) {
      setAreaId(initial.life_area_id);
      setSelectedKey(initial.metric_key);
      setMetricDate(initial.metric_date);
      setValue(initial.value_numeric !== null && initial.value_numeric !== undefined ? String(initial.value_numeric) : "");
      setUnit(initial.unit ?? "");
    } else {
      const defaultPresets = METRIC_KEYS[areaId] ?? [];
      setSelectedKey(defaultPresets[0]?.key ?? "");
      setValue("");
      setUnit(defaultPresets[0]?.defaultUnit ?? "");
    }
  }, [initial]);

  function handleAreaChange(newAreaId: number) {
    setAreaId(newAreaId);
    const newPresets = METRIC_KEYS[newAreaId] ?? [];
    const firstKey = newPresets[0]?.key ?? "";
    setSelectedKey(firstKey);
    setUnit(newPresets[0]?.defaultUnit ?? "");
  }

  function handleKeyChange(key: string) {
    setSelectedKey(key);
    if (key !== CUSTOM_KEY) {
      const preset = presets.find((p) => p.key === key);
      if (preset) setUnit(preset.defaultUnit);
    }
  }

  function handleSave() {
    if (!finalKey) return;
    onSave({
      life_area_id: areaId,
      metric_key: finalKey,
      metric_date: metricDate,
      value_numeric: value !== "" ? parseFloat(value) : undefined,
      unit: unit.trim() || undefined,
    });
  }

  const canSave = !!finalKey && (!isCustom || customKey.trim().length > 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Area */}
      <div>
        <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] mb-2">Life area</p>
        <div className="flex flex-wrap gap-2">
          {LIFE_AREAS.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => handleAreaChange(area.id)}
              className="text-xs rounded-full px-3 py-1 border transition-colors"
              style={
                areaId === area.id
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
          ))}
        </div>
      </div>

      {/* Metric key */}
      <div>
        <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] mb-2">Metric</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handleKeyChange(p.key)}
              className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                selectedKey === p.key
                  ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]"
                  : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))] hover:border-[hsl(var(--accent)/0.5)]"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleKeyChange(CUSTOM_KEY)}
            className={`text-xs rounded-full px-3 py-1 border transition-colors ${
              isCustom
                ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]"
                : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))] hover:border-[hsl(var(--accent)/0.5)]"
            }`}
          >
            Custom…
          </button>
        </div>
        {isCustom && (
          <Input
            placeholder="metric_key (e.g. pushups)"
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
          />
        )}
      </div>

      {/* Date + value + unit */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-[hsl(var(--fg-secondary))]">Date</p>
          <input
            type="date"
            value={metricDate}
            onChange={(e) => setMetricDate(e.target.value)}
            className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] px-3 py-1.5 text-sm text-[hsl(var(--fg-primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <p className="text-xs font-medium text-[hsl(var(--fg-secondary))]">Value</p>
          <Input
            type="number"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            step="any"
          />
        </div>
        <div className="flex flex-col gap-1 w-24">
          <p className="text-xs font-medium text-[hsl(var(--fg-secondary))]">Unit</p>
          <Input
            placeholder="kg, min…"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isLoading || !canSave}>
          {isLoading ? "Saving…" : initial ? "Update" : "Log reading"}
        </Button>
      </div>
    </div>
  );
}
