"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, ScrollText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import { JournalEditor } from "@/components/journal/JournalEditor";
import { useJournalList, useJournalMutations } from "@/lib/hooks/useJournal";
import { LIFE_AREAS, MOOD_TAGS } from "@/types";
import type { JournalEntry } from "@/types";

type PanelState =
  | { mode: "idle" }
  | { mode: "new" }
  | { mode: "edit"; entry: JournalEntry }
  | { mode: "view"; entry: JournalEntry };

export default function JournalPage() {
  const [moodFilter, setMoodFilter] = useState<string>("");
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [panel, setPanel] = useState<PanelState>({ mode: "idle" });

  const { data: entries, isLoading } = useJournalList({
    limit: 100,
    mood_tag: moodFilter || undefined,
    life_area_tag: areaFilter || undefined,
  });

  const { createMutation, updateMutation, deleteMutation } = useJournalMutations();

  function handleSave(data: Parameters<typeof createMutation.mutate>[0]) {
    if (panel.mode === "edit") {
      updateMutation.mutate(
        { id: panel.entry.id, data },
        { onSuccess: () => setPanel({ mode: "idle" }) },
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setPanel({ mode: "idle" }) });
    }
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if ((panel.mode === "edit" || panel.mode === "view") && panel.entry.id === id) {
          setPanel({ mode: "idle" });
        }
      },
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const selectedId =
    panel.mode === "edit" || panel.mode === "view" ? panel.entry.id : undefined;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left — entry list */}
      <div className="w-80 shrink-0 flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--bg-base))]">
        {/* Header */}
        <div className="px-4 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ScrollText size={18} className="text-[hsl(var(--fg-secondary))]" />
              <h1 className="font-semibold text-[hsl(var(--fg-primary))]">Journal</h1>
              {entries && (
                <span className="text-xs text-[hsl(var(--fg-secondary))]">
                  {entries.length}
                </span>
              )}
            </div>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setPanel({ mode: "new" })}
            >
              <Plus size={13} />
              New
            </Button>
          </div>

          {/* Mood filter */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => setMoodFilter("")}
              className={`text-xs rounded-full px-2.5 py-0.5 border transition-colors ${
                moodFilter === ""
                  ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]"
                  : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))]"
              }`}
            >
              All moods
            </button>
            {MOOD_TAGS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMoodFilter((prev) => (prev === m.value ? "" : m.value))}
                className={`text-xs rounded-full px-2.5 py-0.5 border transition-colors ${
                  moodFilter === m.value
                    ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Area filter */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setAreaFilter("")}
              className={`text-xs rounded-full px-2.5 py-0.5 border transition-colors ${
                areaFilter === ""
                  ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]"
                  : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))]"
              }`}
            >
              All areas
            </button>
            {LIFE_AREAS.map((area) => {
              const active = areaFilter === area.slug;
              return (
                <button
                  key={area.slug}
                  onClick={() => setAreaFilter((prev) => (prev === area.slug ? "" : area.slug))}
                  className="text-xs rounded-full px-2.5 py-0.5 border transition-colors"
                  style={
                    active
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
              );
            })}
          </div>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {isLoading && (
            <>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </>
          )}

          {!isLoading && entries?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
              <BookOpen size={32} className="text-[hsl(var(--fg-secondary))]" />
              <p className="text-sm text-[hsl(var(--fg-secondary))]">No entries yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPanel({ mode: "new" })}
              >
                Write your first entry
              </Button>
            </div>
          )}

          {entries?.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              selected={selectedId === entry.id}
              onSelect={(e) => setPanel({ mode: "view", entry: e })}
              onEdit={(e) => setPanel({ mode: "edit", entry: e })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {/* Right — editor / viewer / empty state */}
      <div className="flex-1 overflow-y-auto p-6">
        {panel.mode === "idle" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <ScrollText size={40} className="text-[hsl(var(--fg-secondary)/0.4)]" />
            <p className="text-sm text-[hsl(var(--fg-secondary))]">
              Select an entry to read, or write a new one
            </p>
            <Button onClick={() => setPanel({ mode: "new" })}>
              <Plus size={14} className="mr-1" /> New entry
            </Button>
          </div>
        )}

        {(panel.mode === "new" || panel.mode === "edit") && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-sm font-semibold text-[hsl(var(--fg-secondary))] mb-4">
              {panel.mode === "new" ? "New entry" : "Edit entry"}
            </h2>
            <JournalEditor
              initial={panel.mode === "edit" ? panel.entry : undefined}
              onSave={handleSave}
              onCancel={() =>
                setPanel(
                  panel.mode === "edit"
                    ? { mode: "view", entry: panel.entry }
                    : { mode: "idle" },
                )
              }
              isLoading={isSaving}
            />
          </div>
        )}

        {panel.mode === "view" && (
          <div className="max-w-2xl mx-auto">
            {/* Entry header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-[hsl(var(--fg-secondary))] mb-1">
                  {format(parseISO(panel.entry.entry_date), "EEEE, MMMM d yyyy")}
                </p>
                {panel.entry.title && (
                  <h2 className="text-xl font-semibold text-[hsl(var(--fg-primary))]">
                    {panel.entry.title}
                  </h2>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPanel({ mode: "edit", entry: panel.entry })}
              >
                Edit
              </Button>
            </div>

            {/* Tags */}
            {(panel.entry.mood_tag || (panel.entry.life_area_tags ?? []).length > 0) && (
              <div className="flex flex-wrap gap-2 mb-5">
                {panel.entry.mood_tag && (
                  <span className="text-xs rounded-full px-3 py-1 bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]">
                    {MOOD_TAGS.find((m) => m.value === panel.entry.mood_tag)?.label ?? panel.entry.mood_tag}
                  </span>
                )}
                {(panel.entry.life_area_tags ?? []).map((slug) => {
                  const area = LIFE_AREAS.find((a) => a.slug === slug);
                  if (!area) return null;
                  return (
                    <span
                      key={slug}
                      className="text-xs rounded-full px-3 py-1"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${area.color} 15%, transparent)`,
                        color: area.color,
                      }}
                    >
                      {area.name}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Content */}
            <div className="text-sm text-[hsl(var(--fg-primary))] leading-relaxed whitespace-pre-wrap">
              {panel.entry.content}
            </div>

            {/* AI summary if present */}
            {panel.entry.ai_summary && (
              <div className="mt-8 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
                <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] mb-2">AI summary</p>
                <p className="text-sm text-[hsl(var(--fg-primary))]">{panel.entry.ai_summary}</p>
                {panel.entry.ai_themes && panel.entry.ai_themes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {panel.entry.ai_themes.map((theme) => (
                      <span
                        key={theme}
                        className="text-xs rounded-full px-2.5 py-0.5 bg-[hsl(var(--fg-secondary)/0.1)] text-[hsl(var(--fg-secondary))]"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
