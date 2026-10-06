import { cn } from "@/lib/utils/cn";
import { Delta } from "@/components/ui/delta";
import { Sparkline } from "@/components/charts/sparkline";

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: number | null;
  /** Lower is better (stress, spending): flips the delta colouring. */
  invertDelta?: boolean;
  deltaSuffix?: string;
  sparkline?: (number | null)[];
  /** Colour string for the sparkline (see `tokenColor`); defaults to the accent. */
  sparklineColor?: string;
  /** Tailwind border colour class for the left accent, e.g. an area's `border` class. */
  borderClass?: string;
  className?: string;
}

/** A nested tile (bg-elevated) showing one number, its change and an optional trend line. */
export function StatTile({
  label,
  value,
  unit,
  delta,
  invertDelta,
  deltaSuffix,
  sparkline,
  sparklineColor,
  borderClass,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg bg-elevated p-3",
        borderClass && cn("border-l-[3px]", borderClass),
        className
      )}
    >
      <span className="truncate text-xs text-fg-secondary">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums text-foreground">{value ?? "—"}</span>
        {unit && <span className="text-xs text-fg-muted">{unit}</span>}
      </div>
      {delta !== undefined && <Delta delta={delta} invert={invertDelta} suffix={deltaSuffix} />}
      {sparkline && <Sparkline data={sparkline} color={sparklineColor} className="mt-1" />}
    </div>
  );
}
