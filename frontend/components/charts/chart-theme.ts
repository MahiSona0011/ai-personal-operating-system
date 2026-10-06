import { tokenColor } from "@/lib/utils/color";

/** Shared Recharts styling. All colours come from the chart tokens in styles/tokens.css, so charts follow the theme. */
export const chartColors = {
  grid: tokenColor("chart-grid", 0.6),
  axis: tokenColor("chart-axis"),
  tooltipBg: tokenColor("chart-tooltip-bg"),
  border: tokenColor("border"),
  text: tokenColor("fg-primary"),
  score: tokenColor("chart-score"),
  mood: tokenColor("chart-mood"),
  energy: tokenColor("chart-energy"),
  trackBg: tokenColor("bg-elevated"),
} as const;

export const gridProps = {
  stroke: chartColors.grid,
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const axisProps = {
  tick: { fontSize: 11, fill: chartColors.axis },
  axisLine: false,
  tickLine: false,
} as const;

export const polarGridProps = { stroke: chartColors.grid } as const;

export const tooltipCursor = { stroke: chartColors.border, strokeWidth: 1 } as const;

/** Props for Recharts' default <Tooltip> when a custom ChartTooltip isn't needed. */
export const tooltipProps = {
  contentStyle: {
    background: chartColors.tooltipBg,
    border: `1px solid ${chartColors.border}`,
    borderRadius: 8,
    fontSize: 12,
    color: chartColors.text,
  },
  labelStyle: { color: chartColors.axis },
  itemStyle: { color: chartColors.text },
  cursor: tooltipCursor,
} as const;
