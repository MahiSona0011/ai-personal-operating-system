"use client";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIFE_AREAS, MOOD_TAGS } from "@/types";
import type { JournalEntry } from "@/types";
import { SelectableCard } from "@/components/ui/selectable-card";
import { confirmDelete } from "@/lib/confirm";
import { cn } from "@/lib/utils/cn";

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
    <SelectableCard
      label={`Open journal entry from ${format(parseISO(entry.entry_date), "MMM d, yyyy")}${entry.title ? `: ${entry.title}` : ""}`}
      selected={selected}
      onSelect={() => onSelect(entry)}
      className="p-4"
      actions={
        <>
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Edit entry" onClick={() => onEdit(entry)}>
            <Pencil size={12} aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive-fg hover:text-destructive-fg"
            aria-label="Delete entry"
            onClick={async () => { if (await confirmDelete(entry.title ? `“${entry.title}”` : "this journal entry")) onDelete(entry.id); }}
          >
            <Trash2 size={12} aria-hidden />
          </Button>
        </>
      }
    >
      {/* Date */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-fg-secondary">
          {format(parseISO(entry.entry_date), "EEE, MMM d yyyy")}
        </span>
      </div>

      {/* Title */}
      {entry.title && (
        <p className="font-semibold text-sm text-foreground mb-1 truncate">
          {entry.title}
        </p>
      )}

      {/* Content preview */}
      <p className="text-xs text-fg-secondary line-clamp-2 mb-2">{preview}</p>

      {/* Tags row */}
      {(moodLabel || areaTags.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {moodLabel && (
            <span className="text-xs rounded-full px-2 py-0.5 bg-accent/[0.12] text-accent-fg">
              {moodLabel}
            </span>
          )}
          {areaTags.map((area) => (
            <span
              key={area!.slug}
              className={cn("text-xs rounded-full px-2 py-0.5", area!.soft, area!.text)}
            >
              {area!.name}
            </span>
          ))}
        </div>
      )}
    </SelectableCard>
  );
}
