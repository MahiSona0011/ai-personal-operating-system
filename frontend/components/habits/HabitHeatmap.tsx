"use client";
import { useMemo, useState } from "react";
import { format, subDays, startOfDay } from "date-fns";
import type { HabitLogEntry } from "@/types";

const WEEKS = 12;
const DAYS = WEEKS * 7; // 84

interface HabitHeatmapProps {
  logs: HabitLogEntry[];
  targetCount: number;
  color: string;
}

function buildGrid(logs: HabitLogEntry[], targetCount: number, color: string) {
  const today = startOfDay(new Date());
  const logMap = new Map<string, HabitLogEntry>();
  for (const log of logs) {
    logMap.set(log.log_date, log);
  }

  const cells: {
    date: string;
    label: string;
    isFuture: boolean;
    intensity: number; // 0 = no log, 0.33/0.66/1.0 based on count vs target
  }[] = [];

  for (let i = DAYS - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const key = format(d, "yyyy-MM-dd");
    const log = logMap.get(key);
    const intensity = log
      ? Math.min(log.completion_count / Math.max(targetCount, 1), 1)
      : 0;

    cells.push({
      date: key,
      label: format(d, "MMM d, yyyy"),
      isFuture: false,
      intensity,
    });
  }

  return cells;
}

function intensityToStyle(intensity: number, color: string) {
  if (intensity === 0) return {};
  // Parse hsl color and apply opacity
  return { backgroundColor: color, opacity: 0.25 + intensity * 0.75 };
}

export function HabitHeatmap({ logs, targetCount, color }: HabitHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ label: string; count: number } | null>(null);

  const cells = useMemo(() => buildGrid(logs, targetCount, color), [logs, targetCount]);

  // Arrange into columns (weeks), each week = 7 cells (Mon→Sun)
  const columns: typeof cells[] = [];
  for (let w = 0; w < WEEKS; w++) {
    columns.push(cells.slice(w * 7, w * 7 + 7));
  }

  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="overflow-x-auto pb-1">
    <div className="relative min-w-max">
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center text-[8px] text-muted-foreground">
              {i % 2 === 0 ? d : ""}
            </div>
          ))}
        </div>
        {/* Week columns */}
        {columns.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => {
              const logEntry = logs.find((l) => l.log_date === cell.date);
              return (
                <div
                  key={cell.date}
                  className="w-3 h-3 rounded-sm bg-elevated transition-opacity cursor-default"
                  style={cell.intensity > 0 ? intensityToStyle(cell.intensity, color) : undefined}
                  onMouseEnter={() =>
                    setTooltip({
                      label: cell.label,
                      count: logEntry?.completion_count ?? 0,
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-foreground text-background text-[10px] whitespace-nowrap pointer-events-none z-10">
          {tooltip.label}
          {tooltip.count > 0 && ` · ${tooltip.count}×`}
        </div>
      )}
    </div>
    </div>
  );
}
