"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIFE_AREAS, MOOD_TAGS } from "@/types";
import type { JournalEntry } from "@/types";

interface JournalEditorProps {
  initial?: JournalEntry;
  onSave: (data: {
    entry_date: string;
    title?: string;
    content: string;
    mood_tag?: string;
    life_area_tags?: string[];
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function JournalEditor({ initial, onSave, onCancel, isLoading }: JournalEditorProps) {
  const [entryDate, setEntryDate] = useState(
    initial?.entry_date ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [moodTag, setMoodTag] = useState<string>(initial?.mood_tag ?? "");
  const [areaTags, setAreaTags] = useState<string[]>(initial?.life_area_tags ?? []);

  useEffect(() => {
    if (initial) {
      setEntryDate(initial.entry_date);
      setTitle(initial.title ?? "");
      setContent(initial.content ?? "");
      setMoodTag(initial.mood_tag ?? "");
      setAreaTags(initial.life_area_tags ?? []);
    } else {
      setEntryDate(format(new Date(), "yyyy-MM-dd"));
      setTitle("");
      setContent("");
      setMoodTag("");
      setAreaTags([]);
    }
  }, [initial]);

  function toggleArea(slug: string) {
    setAreaTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function handleSave() {
    if (!content.trim()) return;
    onSave({
      entry_date: entryDate,
      title: title.trim() || undefined,
      content: content.trim(),
      mood_tag: moodTag || undefined,
      life_area_tags: areaTags.length > 0 ? areaTags : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Date + Title row */}
      <div className="flex gap-3">
        <input
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] px-3 py-1.5 text-sm text-[hsl(var(--fg-primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]"
        />
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Content */}
      <textarea
        placeholder="What's on your mind…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        className="w-full flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] px-3 py-2 text-sm text-[hsl(var(--fg-primary))] placeholder:text-[hsl(var(--fg-secondary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))] resize-none"
      />

      {/* Mood selector */}
      <div>
        <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] mb-2">Mood</p>
        <div className="flex flex-wrap gap-2">
          {MOOD_TAGS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMoodTag((prev) => (prev === m.value ? "" : m.value))}
              className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                moodTag === m.value
                  ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]"
                  : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))] hover:border-[hsl(var(--accent)/0.5)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Life area tags */}
      <div>
        <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] mb-2">Life areas</p>
        <div className="flex flex-wrap gap-2">
          {LIFE_AREAS.map((area) => {
            const active = areaTags.includes(area.slug);
            return (
              <button
                key={area.slug}
                type="button"
                onClick={() => toggleArea(area.slug)}
                className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                  active
                    ? ""
                    : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))] hover:border-[hsl(var(--accent)/0.5)]"
                }`}
                style={
                  active
                    ? {
                        borderColor: area.color,
                        backgroundColor: `color-mix(in srgb, ${area.color} 15%, transparent)`,
                        color: area.color,
                      }
                    : undefined
                }
              >
                {area.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isLoading || !content.trim()}
        >
          {isLoading ? "Saving…" : initial ? "Update" : "Save entry"}
        </Button>
      </div>
    </div>
  );
}
