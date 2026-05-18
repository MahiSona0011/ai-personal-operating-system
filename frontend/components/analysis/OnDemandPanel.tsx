"use client";
import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIFE_AREAS } from "@/types";
import type { AIRecommendation } from "@/types";

const SUGGESTED_QUESTIONS = [
  "What habit is having the biggest positive impact this week?",
  "Which life area needs the most attention right now?",
  "Am I making progress toward my most important goal?",
  "What pattern is holding me back the most?",
];

interface OnDemandPanelProps {
  onSubmit: (question: string, contextAreas: string[]) => void;
  isLoading: boolean;
  result: AIRecommendation | null;
}

export function OnDemandPanel({ onSubmit, isLoading, result }: OnDemandPanelProps) {
  const [question, setQuestion] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  function toggleArea(slug: string) {
    setSelectedAreas((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    onSubmit(question.trim(), selectedAreas);
  }

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-5 flex flex-col gap-4">
      <h3 className="font-semibold text-[hsl(var(--fg-primary))]">Ask your AI coach</h3>

      {/* Suggested questions */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => setQuestion(q)}
            className="text-xs rounded-full border border-[hsl(var(--border))] px-3 py-1 text-[hsl(var(--fg-secondary))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--fg-primary))] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about your data, patterns, or progress..."
          rows={3}
          className="w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-base))] px-3 py-2 text-sm text-[hsl(var(--fg-primary))] placeholder:text-[hsl(var(--fg-secondary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]"
        />

        {/* Area filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {LIFE_AREAS.map((a) => (
            <button
              type="button"
              key={a.slug}
              onClick={() => toggleArea(a.slug)}
              className={`text-xs rounded-full px-2.5 py-0.5 border transition-colors ${
                selectedAreas.includes(a.slug)
                  ? "border-transparent text-white"
                  : "border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))]"
              }`}
              style={
                selectedAreas.includes(a.slug)
                  ? { backgroundColor: a.color }
                  : {}
              }
            >
              {a.name}
            </button>
          ))}
        </div>

        <Button type="submit" disabled={isLoading || !question.trim()} className="self-end">
          {isLoading ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" /> Thinking…
            </>
          ) : (
            <>
              <Send size={14} className="mr-2" /> Ask
            </>
          )}
        </Button>
      </form>

      {/* Result */}
      {result && (
        <div className="border-t border-[hsl(var(--border))] pt-4 flex flex-col gap-3">
          {result.summary && (
            <p className="text-sm text-[hsl(var(--fg-primary))] leading-relaxed">{result.summary}</p>
          )}
          {result.action_items && result.action_items.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] mb-1.5 uppercase tracking-wide">Next steps</p>
              <ul className="flex flex-col gap-1">
                {result.action_items.map((item, i) => {
                  const area = LIFE_AREAS.find((a) => a.slug === item.area);
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs text-[hsl(var(--fg-primary))]">
                      <span
                        className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: area?.color ?? "hsl(var(--accent))" }}
                      />
                      {item.action}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {(result.raw_response as Record<string, unknown>).caveat && (
            <p className="text-xs text-[hsl(var(--fg-secondary))] italic">
              Note: {String((result.raw_response as Record<string, unknown>).caveat)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
