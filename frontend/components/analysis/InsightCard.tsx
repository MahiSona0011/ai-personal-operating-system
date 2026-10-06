"use client";
import { useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Brain, Star, X, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LIFE_AREAS } from "@/types";
import { asString } from "@/lib/utils/parse";
import type { AIRecommendation } from "@/types";
import { tokenColor } from "@/lib/utils/color";
import { cn } from "@/lib/utils/cn";

const TYPE_LABEL: Record<string, string> = {
  daily_analysis: "Daily Analysis",
  weekly_review: "Weekly Review",
  on_demand: "On-Demand",
  journal_insight: "Journal Insight",
};

// Colour for icons and the top border, and the readable (-fg) class for the type label text.
const TYPE_COLOR: Record<string, string> = {
  daily_analysis: tokenColor("accent"),
  weekly_review: tokenColor("accent-2"),
  on_demand: tokenColor("accent-2"),
  journal_insight: tokenColor("warning"),
};
const TYPE_TEXT: Record<string, string> = {
  daily_analysis: "text-accent-fg",
  weekly_review: "text-area-growth-fg",
  on_demand: "text-area-growth-fg",
  journal_insight: "text-warning-fg",
};

interface InsightCardProps {
  rec: AIRecommendation;
  onDismiss?: (id: number) => void;
  onRate?: (id: number, rating: number) => void;
  /** Area-page variant: summary, top insight and two actions only; no patterns, ratings or expand. */
  compact?: boolean;
}

export function InsightCard({ rec, onDismiss, onRate, compact = false }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const raw = (rec.raw_response ?? {}) as Record<string, unknown>;
  const topInsight = asString(raw.top_insight);
  const systemAdjustment = asString(raw.system_adjustment);
  const color = TYPE_COLOR[rec.recommendation_type] ?? tokenColor("accent");

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3"
      style={{ borderTopColor: color, borderTopWidth: 2 }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain size={15} style={{ color }} />
          <span className={cn("text-xs font-medium", TYPE_TEXT[rec.recommendation_type] ?? "text-accent-fg")}>
            {TYPE_LABEL[rec.recommendation_type] ?? rec.recommendation_type}
          </span>
          <span className="text-xs text-fg-secondary">
            {formatDistanceToNow(parseISO(rec.created_at), { addSuffix: true })}
          </span>
        </div>
        {onDismiss && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-fg-secondary"
            aria-label="Dismiss insight"
            onClick={() => onDismiss(rec.id)}
          >
            <X size={12} aria-hidden />
          </Button>
        )}
      </div>

      {/* Summary */}
      {rec.summary && (
        <p className={cn("text-sm text-foreground leading-relaxed", compact && "line-clamp-3")}>{rec.summary}</p>
      )}

      {/* Top insight (daily) */}
      {topInsight && (
        <div className="flex gap-2 rounded-lg bg-accent/[0.08] p-3">
          <Zap size={14} className="shrink-0 mt-0.5" style={{ color }} />
          <p className="text-xs text-foreground">{topInsight}</p>
        </div>
      )}

      {/* Action items */}
      {rec.action_items && rec.action_items.length > 0 && (
        <div>
          <p className="text-xs font-medium text-fg-secondary mb-1.5 uppercase tracking-wide">Actions</p>
          <ul className="flex flex-col gap-1.5">
            {rec.action_items.slice(0, compact ? 2 : expanded ? undefined : 3).map((item, i) => {
              const area = LIFE_AREAS.find((a) => a.slug === item.area);
              return (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: area?.color ?? color }}
                  />
                  <span className="text-xs text-foreground">{item.action}</span>
                  {area && (
                    <span className={cn("ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded", area.soft, area.text)}>
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
      {!compact && expanded && rec.insights && rec.insights.length > 0 && (
        <div>
          <p className="text-xs font-medium text-fg-secondary mb-1.5 uppercase tracking-wide">Patterns</p>
          <ul className="flex flex-col gap-1">
            {rec.insights.map((p, i) => (
              <li key={i} className="text-xs text-fg-secondary">• {p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* System adjustment (daily) */}
      {!compact && expanded && systemAdjustment && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-fg-secondary mb-1">System change</p>
          <p className="text-xs text-foreground">{systemAdjustment}</p>
        </div>
      )}

      {/* Footer */}
      {!compact && (
      <div className="flex items-center justify-between mt-1">
        <button
          className="flex items-center gap-1 text-xs text-fg-secondary hover:text-foreground transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Less" : "More"}
        </button>
        {/* Star rating */}
        <div className="flex gap-0.5">
          {onRate && [1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              aria-label={`Rate ${n} of 5`}
              onClick={() => onRate(rec.id, n)}
              className={`p-0.5 transition-colors ${(rec.user_rating ?? 0) >= n ? "text-warning-fg" : "text-border hover:text-warning-fg/60"}`}
            >
              <Star size={12} fill={(rec.user_rating ?? 0) >= n ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
