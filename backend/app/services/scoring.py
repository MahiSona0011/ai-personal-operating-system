"""The one definition of Life Score.

Life Score = the mean of the area scores (1-10) for the areas the user chose in onboarding.
Used by check-in saving, the trend and dashboard endpoints, and the weekly digest.

Rules
- Only areas the user selected count. Selection is `preferences.priority_area_ids`; an empty or
  missing selection (or one that matches no current area) means all six areas.
- Only areas that were actually rated count; unrated areas are skipped, not treated as zero.
- If none of the selected areas were rated but others were, fall back to the mean of whatever was
  rated, so a day with a partial check-in still has a score.
- No rated areas at all gives None.
"""
from typing import Iterable, Mapping, Optional

from app.core.areas import AREA_SLUG_BY_ID, AREA_SLUGS


def selected_area_slugs(preferences: Optional[Mapping]) -> list[str]:
    """Area slugs the user picked in onboarding, in canonical order. All six if none are valid."""
    raw = (preferences or {}).get("priority_area_ids") or []
    chosen = {AREA_SLUG_BY_ID[i] for i in raw if isinstance(i, int) and i in AREA_SLUG_BY_ID}
    return [s for s in AREA_SLUGS if s in chosen] or list(AREA_SLUGS)


def life_score(scores: Mapping[str, Optional[float]], selected: Optional[Iterable[str]] = None) -> Optional[float]:
    """Life Score for one day. `scores` maps area slug to its 1-10 rating or None."""
    wanted = set(selected) if selected is not None else set(AREA_SLUGS)
    rated = {k: v for k, v in scores.items() if v is not None}
    pool = [v for k, v in rated.items() if k in wanted] or list(rated.values())
    if not pool:
        return None
    return round(sum(pool) / len(pool), 2)


def mean(values: Iterable[Optional[float]]) -> Optional[float]:
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 2) if vals else None


def delta(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    """current - previous, or None when either period has no data."""
    if current is None or previous is None:
        return None
    return round(current - previous, 2)
