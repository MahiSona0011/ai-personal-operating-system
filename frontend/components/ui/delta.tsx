import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type DeltaTone = "positive" | "negative" | "neutral";

/** Colour a change: up is good unless `invert` (e.g. stress, spend), and a zero/absent change is neutral. */
export function deltaTone(delta: number | null | undefined, invert = false): DeltaTone {
  if (delta == null || delta === 0 || Number.isNaN(delta)) return "neutral";
  const good = invert ? delta < 0 : delta > 0;
  return good ? "positive" : "negative";
}

const TONE_CLASS: Record<DeltaTone, string> = {
  positive: "text-success-fg",
  negative: "text-destructive-fg",
  neutral: "text-fg-muted",
};

/** Accessible description, e.g. "up 0.6", "down 1", "unchanged". */
export function deltaText(delta: number | null | undefined, digits = 1): string {
  if (delta == null || delta === 0 || Number.isNaN(delta)) return "unchanged";
  const n = Math.abs(delta);
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.0+$/, "");
  return `${delta > 0 ? "up" : "down"} ${shown}`;
}

export interface DeltaProps {
  delta: number | null | undefined;
  invert?: boolean;
  digits?: number;
  /** Extra visible context, e.g. "vs last week". */
  suffix?: string;
  className?: string;
}

export function Delta({ delta, invert = false, digits = 1, suffix, className }: DeltaProps) {
  const tone = deltaTone(delta, invert);
  const Icon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  const text = deltaText(delta, digits);
  return (
    <span
      data-tone={tone}
      className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", TONE_CLASS[tone], className)}
    >
      <Icon size={12} aria-hidden />
      <span aria-hidden>{delta == null || delta === 0 ? "0" : Math.abs(delta).toFixed(digits).replace(/\.0+$/, "")}</span>
      <span className="sr-only">{text}</span>
      {suffix && <span className="font-normal text-fg-muted">{suffix}</span>}
    </span>
  );
}
