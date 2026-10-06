"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import type { RangeDays } from "@/lib/range";

export const RANGES: ReadonlyArray<{ value: RangeDays; label: string }> = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
  { value: 365, label: "1Y" },
];

export type { RangeDays };

export interface RangeTabsProps {
  value: RangeDays;
  onChange: (value: RangeDays) => void;
  label?: string;
  className?: string;
}

/** Range switcher as an ARIA radiogroup: one tab stop, arrow keys move and select, Home/End jump. */
export function RangeTabs({ value, onChange, label = "Time range", className }: RangeTabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (to: number) => {
    const i = (to + RANGES.length) % RANGES.length;
    onChange(RANGES[i].value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        return move(i + 1);
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        return move(i - 1);
      case "Home":
        e.preventDefault();
        return move(0);
      case "End":
        e.preventDefault();
        return move(RANGES.length - 1);
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-md bg-elevated p-0.5", className)}>
      {RANGES.map((r, i) => {
        const checked = r.value === value;
        return (
          <button
            key={r.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(r.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              checked ? "bg-surface text-foreground shadow-sm dark:shadow-none" : "text-fg-secondary hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
