import { format, isValid, parseISO } from "date-fns";

interface Entry {
  name?: string | number;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: Entry[];
  label?: string | number;
  /** Format a series value; defaults to the raw value. */
  valueFormatter?: (value: number | string, name: string) => string;
  /** Override the heading; defaults to the label, formatted as a date when it is an ISO date. */
  labelFormatter?: (label: string | number) => string;
}

export function formatChartLabel(label: string | number | undefined): string {
  if (label === undefined) return "";
  if (typeof label === "string" && /^\d{4}-\d{2}-\d{2}/.test(label)) {
    const d = parseISO(label);
    if (isValid(d)) return format(d, "EEE, MMM d");
  }
  return String(label);
}

/** Recharts tooltip content: elevated surface, hairline border, tabular numbers. Use as `<Tooltip content={<ChartTooltip />} />`. */
export function ChartTooltip({ active, payload, label, valueFormatter, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const heading = label === undefined ? "" : labelFormatter ? labelFormatter(label) : formatChartLabel(label);
  return (
    <div className="rounded-md border border-border bg-elevated px-3 py-2 text-xs shadow-sm dark:shadow-none">
      {heading && <p className="mb-1 font-medium text-fg-secondary">{heading}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => {
          if (p.value == null) return null;
          const name = String(p.name ?? p.dataKey ?? "");
          return (
            <li key={`${name}-${i}`} className="flex items-center gap-2 tabular-nums text-foreground">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
              {name && <span className="text-fg-secondary">{name}</span>}
              <span className="ml-auto font-medium">{valueFormatter ? valueFormatter(p.value, name) : p.value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
