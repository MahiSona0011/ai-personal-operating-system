"use client";
import { Loader2, Sparkles } from "lucide-react";
import { isAnalysing } from "@/lib/hooks/useJournal";
import type { JournalEntry } from "@/types";

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "Positive tone",
  neutral: "Neutral tone",
  negative: "Heavy tone",
  mixed: "Mixed tone",
};

/** The AI summary, themes and tone of one entry, or why there isn't one yet. */
export function JournalAiSummary({ entry }: { entry: JournalEntry }) {
  if (isAnalysing(entry)) {
    return (
      <div role="status" className="mt-8 flex items-center gap-2 rounded-xl border border-border bg-surface p-4 text-sm text-fg-secondary">
        <Loader2 size={14} className="animate-spin" aria-hidden />
        Analysing this entry…
      </div>
    );
  }

  if (entry.ai_summary) {
    const tone = entry.ai_sentiment ? SENTIMENT_LABEL[entry.ai_sentiment] : undefined;
    return (
      <section aria-label="AI summary" className="mt-8 rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-secondary">
          <Sparkles size={12} aria-hidden /> AI summary
        </p>
        <p className="text-sm text-foreground">{entry.ai_summary}</p>
        {((entry.ai_themes?.length ?? 0) > 0 || tone) && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Themes">
            {tone && <li className="rounded-full bg-accent/[0.12] px-2.5 py-0.5 text-xs text-accent-fg">{tone}</li>}
            {entry.ai_themes?.map((theme) => (
              <li key={theme} className="rounded-full bg-fg-secondary/10 px-2.5 py-0.5 text-xs text-fg-secondary">
                {theme}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  if (entry.ai_status === "failed") {
    return (
      <p className="mt-8 rounded-xl border border-border bg-surface p-4 text-sm text-fg-secondary">
        The AI summary couldn&apos;t be generated. Editing and saving the entry will try again.
      </p>
    );
  }

  if (entry.ai_status === "skipped") {
    return (
      <p className="mt-8 text-xs text-fg-secondary">
        No AI summary: the entry is very short, or the daily AI limit was reached.
      </p>
    );
  }

  return null;
}
