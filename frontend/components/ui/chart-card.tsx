import { cn } from "@/lib/utils/cn";
import { Delta } from "@/components/ui/delta";
import { RangeTabs, type RangeDays } from "@/components/ui/range-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, type EmptyStateProps } from "@/components/ui/empty-state";

export interface ChartCardProps {
  title: string;
  /** Headline number shown beside the title. */
  value?: React.ReactNode;
  delta?: number | null;
  invertDelta?: boolean;
  deltaSuffix?: string;
  range?: RangeDays;
  onRangeChange?: (range: RangeDays) => void;
  loading?: boolean;
  /** Shown instead of the chart when set (e.g. no data in range). */
  empty?: Pick<EmptyStateProps, "icon" | "title" | "description" | "action">;
  /** Chart area height in px; the skeleton and empty state use the same height so layout doesn't jump. */
  height?: number;
  /** Extra control in the header, next to the range tabs (e.g. a "Log value" button). */
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function ChartCard({
  title,
  value,
  delta,
  invertDelta,
  deltaSuffix,
  range,
  onRangeChange,
  loading,
  empty,
  height = 220,
  action,
  className,
  children,
}: ChartCardProps) {
  return (
    <section className={cn("rounded-xl border border-border bg-surface p-4 shadow-sm dark:shadow-none", className)}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {(value !== undefined || delta !== undefined) && (
            <div className="mt-0.5 flex items-baseline gap-2">
              {value !== undefined && <span className="text-2xl font-bold tabular-nums text-foreground">{value}</span>}
              {delta !== undefined && <Delta delta={delta} invert={invertDelta} suffix={deltaSuffix} />}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {range !== undefined && onRangeChange && <RangeTabs value={range} onChange={onRangeChange} />}
        </div>
      </header>
      <div style={{ height }}>
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : empty ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState {...empty} />
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
