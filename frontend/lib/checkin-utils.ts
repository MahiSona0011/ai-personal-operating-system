/** How long after completing a check-in we keep expecting its AI analysis before giving up. */
export const ANALYSIS_WAIT_MS = 3 * 60_000;

interface CheckinLike {
  is_complete?: boolean;
  ai_analysis?: unknown;
  completed_at?: string | null;
}

/**
 * True while today's analysis is plausibly still being generated: the check-in was completed
 * recently and has no analysis yet. After that we stop saying "analysing" (it probably failed).
 */
export function isAnalysisPending(checkin: CheckinLike | null | undefined, now: number = Date.now()): boolean {
  if (!checkin?.is_complete || checkin.ai_analysis) return false;
  if (!checkin.completed_at) return true;
  const done = Date.parse(checkin.completed_at);
  return Number.isNaN(done) ? true : now - done < ANALYSIS_WAIT_MS;
}
