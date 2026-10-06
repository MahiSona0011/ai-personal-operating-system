"use client";
import { format } from "date-fns";
import { CheckCircle2, Circle, Pencil, Trash2, Flame, Trophy, BarChart2 } from "lucide-react";
import { HabitHeatmap } from "./HabitHeatmap";
import { confirmDelete } from "@/lib/confirm";
import { useHabitLogs } from "@/lib/hooks/useHabits";
import { LIFE_AREAS } from "@/types";
import type { Habit } from "@/types";
import { tokenColor } from "@/lib/utils/color";

interface HabitCardProps {
  habit: Habit;
  completedToday: boolean;
  onLog: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isLogging?: boolean;
  /** 30-day completion percentage (0-100), shown when known. */
  rate30?: number | null;
}

export function HabitCard({
  habit,
  completedToday,
  onLog,
  onEdit,
  onDelete,
  isLogging,
  rate30,
}: HabitCardProps) {
  const { data: logs = [] } = useHabitLogs(habit.id);

  const area = LIFE_AREAS.find((a) => a.id === habit.life_area_id);
  const color = area?.color ?? tokenColor("accent");

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3 hover:border-border-strong transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{habit.title}</p>
            {area && (
              <p className="text-[11px] text-muted-foreground">{area.name}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors"
            title="Edit"
            aria-label={`Edit habit: ${habit.title}`}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={async () => { if (await confirmDelete(`“${habit.title}”`, "Its streak and history will be removed.")) onDelete(); }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive-fg hover:bg-destructive/10 transition-colors"
            title="Delete"
            aria-label={`Delete habit: ${habit.title}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Log today button */}
      <button
        onClick={completedToday ? undefined : onLog}
        disabled={completedToday || isLogging}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          completedToday
            ? "bg-success/10 text-success-fg cursor-default"
            : "bg-elevated hover:bg-elevated/80 text-foreground hover:border-border-strong border border-transparent"
        }`}
      >
        {completedToday ? (
          <CheckCircle2 size={15} />
        ) : (
          <Circle size={15} className="text-muted-foreground" />
        )}
        {completedToday ? "Done today" : "Log today"}
      </button>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Flame size={12} style={{ color: habit.current_streak > 0 ? tokenColor("warning-fg") : undefined }} />
          <span className={habit.current_streak > 0 ? "text-foreground font-medium" : ""}>
            {habit.current_streak}d streak
          </span>
        </span>
        {rate30 != null && (
          <span className="flex items-center gap-1 font-medium text-foreground" title="Share of expected days completed in the last 30 days">
            {Math.round(rate30)}% · 30 days
          </span>
        )}
        <span className="flex items-center gap-1">
          <Trophy size={12} />
          best {habit.longest_streak}d
        </span>
        <span className="flex items-center gap-1">
          <BarChart2 size={12} />
          {habit.total_completions} total
        </span>
      </div>

      {/* Heatmap */}
      <div className="pt-1">
        <HabitHeatmap logs={logs} targetCount={habit.target_count} color={color} />
      </div>
    </div>
  );
}
