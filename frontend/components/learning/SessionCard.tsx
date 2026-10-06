"use client";
import { Clock, Star, Trash2, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { LIFE_AREAS } from "@/types";
import type { WorkSession } from "@/types";
import { tokenColor } from "@/lib/utils/color";
import { cn } from "@/lib/utils/cn";
import { confirmDelete } from "@/lib/confirm";

const SESSION_TYPE_LABEL: Record<string, string> = {
  deep_work: "Deep Work",
  learning: "Learning",
  exercise: "Exercise",
  reading: "Reading",
  practice: "Practice",
  meeting: "Meeting",
  other: "Other",
};

interface SessionCardProps {
  session: WorkSession;
  onDelete: (id: number) => void;
}

export function SessionCard({ session, onDelete }: SessionCardProps) {
  const area = LIFE_AREAS.find((a) => a.id === session.life_area_id);

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
      {/* Area color dot */}
      <div
        className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: area?.color ?? tokenColor("accent") }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-sm text-foreground truncate">{session.title}</span>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Delete session: ${session.title}`}
            className="h-6 w-6 shrink-0 text-fg-secondary hover:text-destructive-fg"
            onClick={async () => { if (await confirmDelete(`“${session.title}”`)) onDelete(session.id); }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {area && (
            <span className={cn("text-xs", area.text)}>
              {area.name}
            </span>
          )}
          <span className="text-xs text-fg-secondary">
            {SESSION_TYPE_LABEL[session.session_type] ?? session.session_type}
          </span>
          {session.duration_minutes != null && (
            <span className="flex items-center gap-0.5 text-xs text-fg-secondary">
              <Clock size={11} />
              {session.duration_minutes}m
            </span>
          )}
          {session.quality_rating != null && (
            <span className="flex items-center gap-0.5 text-xs text-warning-fg">
              <Star size={11} />
              {session.quality_rating}/5
            </span>
          )}
          <span className="text-xs text-fg-secondary">
            {format(parseISO(session.started_at), "h:mm a")}
          </span>
        </div>
        {session.notes && (
          <p className="mt-1 text-xs text-fg-secondary line-clamp-2">{session.notes}</p>
        )}
      </div>
    </div>
  );
}
