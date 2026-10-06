import { AREAS, type AreaKey } from "@/lib/areas";

/**
 * Life Score on the client; a mirror of backend/app/services/scoring.py, kept identical on purpose:
 * the mean of the rated areas the user picked in onboarding (all six if none), falling back to
 * whatever was rated if none of the picked ones were.
 */
export function selectedAreaKeys(preferences: Record<string, unknown> | null | undefined): AreaKey[] {
  const raw = preferences?.priority_area_ids;
  const ids = Array.isArray(raw) ? raw : [];
  const chosen = AREAS.filter((a) => ids.includes(a.id)).map((a) => a.key);
  return chosen.length > 0 ? chosen : AREAS.map((a) => a.key);
}

export function lifeScore(
  scores: Partial<Record<AreaKey, number | null | undefined>>,
  selected: AreaKey[] = AREAS.map((a) => a.key)
): number | null {
  const rated = (Object.entries(scores) as [AreaKey, number | null | undefined][]).filter(
    (e): e is [AreaKey, number] => e[1] != null
  );
  const pool = rated.filter(([k]) => selected.includes(k)).map(([, v]) => v);
  const values = pool.length > 0 ? pool : rated.map(([, v]) => v);
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}
