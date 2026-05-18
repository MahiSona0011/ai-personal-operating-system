import { cn } from "@/lib/utils/cn";

interface ProgressProps {
  value?: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({ value = 0, className, indicatorClassName }: ProgressProps) {
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--bg-elevated))]", className)}>
      <div
        className={cn("h-full rounded-full bg-[hsl(var(--accent))] transition-all duration-300", indicatorClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
