"use client";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIFE_AREAS, MOOD_TAGS } from "@/types";
import type { JournalEntry } from "@/types";

interface JournalEntryCardProps {
  entry: JournalEntry;
  selected?: boolean;
  onSelect: (entry: JournalEntry) => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: number) => void;
}

export function JournalEntryCard({
  entry,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: JournalEntryCardProps) {
  const moodLabel = MOOD_TAGS.find((m) => m.value === entry.mood_tag)?.label;
  const areaTags = (entry.life_area_tags ?? [])
    .map((slug) => LIFE_AREAS.find((a) => a.slug === slug))
    .filter(Boolean);

  const preview = entry.content.slice(0, 120) + (entry.content.length > 120 ? "…" : "");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entry)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(entry)}
      className={`group rounded-xl border p-4 cursor-pointer transition-colors ${
        selected
          ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.06)]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] hover:border-[hsl(var(--accent)/0.4)]"
      }`}
    >
      {/* Date + actions */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[hsl(var(--fg-secondary))]">
          {format(parseISO(entry.entry_date), "EEE, MMM d yyyy")}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
          >
            <Pencil size={12} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-[hsl(var(--area-health))] hover:text-[hsl(var(--area-health))]"
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      {/* Title */}
      {entry.title && (
        <p className="font-semibold text-sm text-[hsl(var(--fg-primary))] mb-1 truncate">
          {entry.title}
        </p>
      )}

      {/* Content preview */}
      <p className="text-xs text-[hsl(var(--fg-secondary))] line-clamp-2 mb-2">{preview}</p>

      {/* Tags row */}
      {(moodLabel || areaTags.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {moodLabel && (
            <span className="text-xs rounded-full px-2 py-0.5 bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]">
              {moodLabel}
            </span>
          )}
          {areaTags.map((area) => (
            <span
              key={area!.slug}
              className="text-xs rounded-full px-2 py-0.5"
              style={{
                backgroundColor: `color-mix(in srgb, ${area!.color} 15%, transparent)`,
                color: area!.color,
              }}
            >
              {area!.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
