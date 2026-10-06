import { differenceInCalendarDays, parseISO } from "date-fns";

export type DeadlineTone = "overdue" | "soon" | "ok";

/** Days at or under which a deadline is shown as a warning. */
export const SOON_DAYS = 7;

/** "12 days left", "Due today", "3 days overdue", with a tone for colouring. Null when there is no date. */
export function goalDeadline(
  targetDate: string | null | undefined,
  now: Date = new Date()
): { label: string; tone: DeadlineTone; days: number } | null {
  if (!targetDate) return null;
  const days = differenceInCalendarDays(parseISO(targetDate), now);
  const plural = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  if (days < 0) return { label: `${plural(-days)} overdue`, tone: "overdue", days };
  if (days === 0) return { label: "Due today", tone: "soon", days };
  return { label: `${plural(days)} left`, tone: days <= SOON_DAYS ? "soon" : "ok", days };
}

export const DEADLINE_TEXT: Record<DeadlineTone, string> = {
  overdue: "text-destructive-fg font-medium",
  soon: "text-warning-fg font-medium",
  ok: "text-fg-secondary",
};
