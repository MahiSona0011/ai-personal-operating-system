"use client";
import { useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Brain, Star, X, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LIFE_AREAS } from "@/types";
import type { AIRecommendation } from "@/types";

const TYPE_LABEL: Record<string, string> = {
  daily_analysis: "Daily Analysis",
  weekly_review: "Weekly Review",
  on_demand: "On-Demand",
  journal_insight: "Journal Insight",
};

const TYPE_COLOR: Record<string, string> = {
  daily_analysis: "hsl(var(--accent))",
  weekly_review: "hsl(var(--area-career))",
  on_demand: "hsl(var(--area-focus))",
  journal_insight: "hsl(var(--area-mental))",
};

interface InsightCardProps {
  rec: AIRecommendation;
  onDismiss: (id: number) => void;
  onRate: (id: number, rating: number) => void;
}

export function InsightCard({ rec, onDismiss, onRate }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const raw = rec.raw_response as Record<string, unknown>;
  const color = TYPE_COLOR[rec.recommendation_type] ?? "hsl(var(--accent))";

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4 flex flex-col gap-3"
      style={{ borderTopColor: color, borderTopWidth: 2 }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain size={15} style={{ color }} />
          <span className="text-xs font-medium" style={{ color }}>
            {TYPE_LABEL[rec.recommendation_type] ?? rec.recommendation_type}
          </span>
          <span className="text-xs text-[hsl(var(--fg-secondary))]">
            {formatDistanceToNow(parseISO(rec.created_at), { addSuffix: true })}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-[hsl(var(--fg-secondary))]"
          onClick={() => onDismiss(rec.id)}
        >
          <X size={12} />
        </Button>
      </div>

      {/* Summary */}
      {rec.summary && (
        <p className="text-sm text-[hsl(var(--fg-primary))] leading-relaxed">{rec.summary}</p>
      )}

      {/* Top insight (daily) */}
      {raw.top_insight && (
        <div className="flex gap-2 rounded-lg bg-[hsl(var(--accent)/0.08)] p-3">
          <Zap size={14} className="shrink-0 mt-0.5" style={{ color }} />
          <p className="text-xs text-[hsl(var(--fg-primary))]">{String(raw.top_insight)}</p>
        </div>
      )}

      {/* Action items */}
      {rec.action_items && rec.action_items.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] mb-1.5 uppercase tracking-wide">Actions</p>
          <ul className="flex flex-col gap-1.5">
            {rec.action_items.slice(0, expanded ? undefined : 3).map((item, i) => {
              const area = LIFE_AREAS.find((a) => a.slug === item.area);
              return (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: area?.color ?? color }}
                  />
                  <span className="text-xs text-[hsl(var(--fg-primary))]">{item.action}</span>
                  {area && (
                    <span className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${area.color}22`, color: area.color }}>
                      {area.name}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Patterns / Insights */}
      {expanded && rec.insights && rec.insights.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] mb-1.5 uppercase tracking-wide">Patterns</p>
          <ul className="flex flex-col gap-1">
            {rec.insights.map((p, i) => (
              <li key={i} className="text-xs text-[hsl(var(--fg-secondary))]">• {p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* System adjustment (daily) */}
      {expanded && raw.system_adjustment && (
        <div className="rounded-lg border border-[hsl(var(--border))] p-3">
          <p className="text-xs font-medium text-[hsl(var(--fg-secondary))] mb-1">System change</p>
          <p className="text-xs text-[hsl(var(--fg-primary))]">{String(raw.system_adjustment)}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <button
          className="flex items-center gap-1 text-xs text-[hsl(var(--fg-secondary))] hover:text-[hsl(var(--fg-primary))] transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Less" : "More"}
        </button>
        {/* Star rating */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onRate(rec.id, n)}
              className={`p-0.5 transition-colors ${(rec.user_rating ?? 0) >= n ? "text-[hsl(var(--area-mental))]" : "text-[hsl(var(--border))] hover:text-[hsl(var(--area-mental)/0.6)]"}`}
            >
              <Star size={12} fill={(rec.user_rating ?? 0) >= n ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
