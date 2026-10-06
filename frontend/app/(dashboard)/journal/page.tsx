"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Plus, ScrollText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import { JournalEditor } from "@/components/journal/JournalEditor";
import { JournalAiSummary } from "@/components/journal/JournalAiSummary";
import { useJournalList, useJournalMutations } from "@/lib/hooks/useJournal";
import { LIFE_AREAS, MOOD_TAGS } from "@/types";
import type { JournalEntry } from "@/types";
import { tokenColor } from "@/lib/utils/color";
import { cn } from "@/lib/utils/cn";

import { EmptyState } from "@/components/ui/empty-state";
type PanelState =
  | { mode: "idle" }
  | { mode: "new"; prompt?: string }
  | { mode: "edit"; entry: JournalEntry }
  | { mode: "view"; entry: JournalEntry };

export default function JournalPage() {
  // useSearchParams (for ?prompt=) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <JournalContent />
    </Suspense>
  );
}

function JournalContent() {
  const [moodFilter, setMoodFilter] = useState<string>("");
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [panel, setPanel] = useState<PanelState>({ mode: "idle" });

  // The dashboard's evening reflection links here with ?prompt=…: open a new entry that starts with it.
  const params = useSearchParams();
  const prompt = params.get("prompt");
  const wantsNew = params.get("new") === "1"; // "New journal entry" in the command palette
  useEffect(() => {
    if (prompt) setPanel({ mode: "new", prompt: `${prompt}\n\n` });
    else if (wantsNew) setPanel({ mode: "new" });
  }, [prompt, wantsNew]);

  const { data: entries, isLoading } = useJournalList({
    limit: 100,
    mood_tag: moodFilter || undefined,
    life_area_tag: areaFilter || undefined,
  });

  const { createMutation, updateMutation, deleteMutation } = useJournalMutations();

  function handleSave(data: Parameters<typeof createMutation.mutate>[0]) {
    if (panel.mode === "edit") {
      // Open the saved entry so its AI summary appears as soon as it's ready.
      updateMutation.mutate(
        { id: panel.entry.id, data },
        { onSuccess: (saved) => setPanel({ mode: "view", entry: saved }) },
      );
    } else {
      createMutation.mutate(data, { onSuccess: (saved) => setPanel({ mode: "view", entry: saved }) });
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
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] overflow-hidden md:-m-6">
      {/* Left — entry list */}
      <div className="w-80 shrink-0 flex flex-col border-r border-border bg-background">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ScrollText size={18} className="text-fg-secondary" />
              <h1 className="font-semibold text-foreground">Journal</h1>
              {entries && (
                <span className="text-xs text-fg-secondary">
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
                  ? "border-accent bg-accent/10 text-accent-fg"
                  : "border-border text-fg-secondary"
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
                    ? "border-accent bg-accent/10 text-accent-fg"
                    : "border-border text-fg-secondary"
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
                  ? "border-accent bg-accent/10 text-accent-fg"
                  : "border-border text-fg-secondary"
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
                  className={cn("text-xs rounded-full px-2.5 py-0.5 border transition-colors", active ? `${area.border} ${area.soft} ${area.text}` : "border-border text-fg-secondary")}
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
            <EmptyState
              icon={BookOpen}
              title="No entries yet"
              description="Write freely about your day. The AI picks out themes and mood over time."
              action={{ label: "Write your first entry", onClick: () => setPanel({ mode: "new" }) }}
              className="py-10"
            />
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
            <ScrollText size={40} className="text-fg-secondary/40" />
            <p className="text-sm text-fg-secondary">
              Select an entry to read, or write a new one
            </p>
            <Button onClick={() => setPanel({ mode: "new" })}>
              <Plus size={14} className="mr-1" /> New entry
            </Button>
          </div>
        )}

        {(panel.mode === "new" || panel.mode === "edit") && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-sm font-semibold text-fg-secondary mb-4">
              {panel.mode === "new" ? "New entry" : "Edit entry"}
            </h2>
            <JournalEditor
              initial={panel.mode === "edit" ? panel.entry : undefined}
              initialContent={panel.mode === "new" ? panel.prompt : undefined}
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
                <p className="text-xs text-fg-secondary mb-1">
                  {format(parseISO(panel.entry.entry_date), "EEEE, MMMM d yyyy")}
                </p>
                {panel.entry.title && (
                  <h2 className="text-xl font-semibold text-foreground">
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
                  <span className="text-xs rounded-full px-3 py-1 bg-accent/[0.12] text-accent-fg">
                    {MOOD_TAGS.find((m) => m.value === panel.entry.mood_tag)?.label ?? panel.entry.mood_tag}
                  </span>
                )}
                {(panel.entry.life_area_tags ?? []).map((slug) => {
                  const area = LIFE_AREAS.find((a) => a.slug === slug);
                  if (!area) return null;
                  return (
                    <span
                      key={slug}
                      className={cn("text-xs rounded-full px-3 py-1", area.soft, area.text)}
                    >
                      {area.name}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Content */}
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {panel.entry.content}
            </div>

            {/* The list refetches while an analysis is pending, so prefer its copy of the entry. */}
            <JournalAiSummary entry={entries?.find((e) => e.id === panel.entry.id) ?? panel.entry} />
          </div>
        )}
      </div>
    </div>
  );
}
