"use client";
import { useState } from "react";
import { CheckCircle2, Circle, Pencil, Trash2, Trophy } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProgressRing } from "./ProgressRing";
import { LIFE_AREAS } from "@/types";
import type { Goal } from "@/types";
import { tokenColor } from "@/lib/utils/color";
import { confirmDelete } from "@/lib/confirm";
import { DEADLINE_TEXT, goalDeadline } from "@/lib/goal-deadline";
import { cn } from "@/lib/utils/cn";

const PRIORITY_LABEL: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High" };
const PRIORITY_COLOR: Record<number, string> = {
  1: "bg-fg-secondary/15 text-fg-secondary",
  2: "bg-warning/15 text-warning-fg",
  3: "bg-destructive/15 text-destructive-fg",
};

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: number) => void;
  onComplete: (id: number) => void;
  onCompleteMilestone: (goalId: number, milestoneId: number) => void;
}

export function GoalCard({ goal, onEdit, onDelete, onComplete, onCompleteMilestone }: GoalCardProps) {
  const [showMilestones, setShowMilestones] = useState(false);
  const area = LIFE_AREAS.find((a) => a.id === goal.life_area_id);
  const isComplete = goal.status === "completed";
  const completedMs = goal.milestones.filter((m) => m.is_completed).length;
  const deadline = goalDeadline(goal.target_date);

  return (
    <div
      className={cn("rounded-xl border border-border bg-surface p-4 flex flex-col gap-3 border-l-[3px]", area?.border)}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <ProgressRing
          progress={goal.progress_pct}
          size={56}
          strokeWidth={5}
          color={area?.color ?? tokenColor("accent")}
          label={`${Math.round(goal.progress_pct)}%`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate">{goal.title}</span>
            {isComplete && <Trophy size={14} className="text-success-fg shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {area && (
              <span className={cn("text-xs", area.text)}>
                {area.name}
              </span>
            )}
            <span className={`text-xs rounded px-1.5 py-0.5 ${PRIORITY_COLOR[goal.priority]}`}>
              {PRIORITY_LABEL[goal.priority] ?? "Medium"}
            </span>
            {goal.target_date && (
              <span className="text-xs text-fg-secondary">
                Due {format(parseISO(goal.target_date), "MMM d, yyyy")}
                {deadline && !isComplete && (
                  <span className={cn("ml-1.5", DEADLINE_TEXT[deadline.tone])} data-deadline={deadline.tone}>
                    · {deadline.label}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        {/* Actions */}
        {!isComplete && (
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Edit goal: ${goal.title}`} onClick={() => onEdit(goal)}>
              <Pencil size={13} aria-hidden />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive-fg hover:text-destructive-fg"
              aria-label={`Delete goal: ${goal.title}`}
              onClick={async () => { if (await confirmDelete(`goal “${goal.title}”`, "Its milestones will be removed too.")) onDelete(goal.id); }}
            >
              <Trash2 size={13} aria-hidden />
            </Button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <Progress value={goal.progress_pct} className="h-1.5" />

      {/* Description / Why */}
      {goal.description && (
        <p className="text-xs text-fg-secondary line-clamp-2">{goal.description}</p>
      )}

      {/* Milestones toggle */}
      {goal.milestones.length > 0 && (
        <div>
          <button
            className="text-xs text-fg-secondary hover:text-foreground transition-colors"
            onClick={() => setShowMilestones((v) => !v)}
          >
            {completedMs}/{goal.milestones.length} milestones {showMilestones ? "▲" : "▼"}
          </button>
          {showMilestones && (
            <ul className="mt-2 flex flex-col gap-1">
              {goal.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <button
                    disabled={m.is_completed || isComplete}
                    aria-label={m.is_completed ? `Milestone done: ${m.title}` : `Complete milestone: ${m.title}`}
                    onClick={() => onCompleteMilestone(goal.id, m.id)}
                    className="text-fg-secondary disabled:opacity-50"
                  >
                    {m.is_completed ? (
                      <CheckCircle2 size={14} className="text-success-fg" />
                    ) : (
                      <Circle size={14} />
                    )}
                  </button>
                  <span
                    className={`text-xs ${m.is_completed ? "line-through text-fg-secondary" : "text-foreground"}`}
                  >
                    {m.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Footer */}
      {!isComplete && (
        <Button
          size="sm"
          variant="outline"
          className="mt-1 self-end text-xs h-7"
          onClick={() => onComplete(goal.id)}
        >
          <Trophy size={12} className="mr-1" /> Mark complete
        </Button>
      )}
    </div>
  );
}
