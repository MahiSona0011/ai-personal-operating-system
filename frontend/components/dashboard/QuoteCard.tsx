"use client";
import { RefreshCw } from "lucide-react";
import { AREA_BY_KEY, type AreaKey } from "@/lib/areas";
import type { Quote } from "@/lib/quotes";
import { cn } from "@/lib/utils/cn";

interface QuoteCardProps {
  quote: Quote;
  /** Set when the quote was picked for the user's weakest area. */
  forArea?: AreaKey | null;
  onNext?: () => void;
}

/** One slim line: the day's quote, who said it, and (when relevant) which area it was chosen for. */
export function QuoteCard({ quote, forArea, onNext }: QuoteCardProps) {
  const area = forArea ? AREA_BY_KEY[forArea] : undefined;
  return (
    <figure className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <blockquote className="min-w-0 flex-1 text-sm text-foreground">
        <span className="italic">“{quote.text}”</span>
        <figcaption className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
          <span>
            {quote.author}
            {quote.source ? `, ${quote.source}` : ""}
          </span>
          {area && (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", area.dot)} />
              <span className={area.text}>for {area.name}</span>
            </span>
          )}
        </figcaption>
      </blockquote>
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          aria-label="Show another quote"
          className="shrink-0 rounded-md p-1.5 text-fg-secondary transition-colors hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <RefreshCw size={14} aria-hidden />
        </button>
      )}
    </figure>
  );
}
