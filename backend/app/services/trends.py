"""Time-series queries behind the dashboard, area pages and charts.

Every function takes the user's own `today` (see services.dates.user_today) so day boundaries
follow the user's timezone, and every query is filtered by user_id.
"""
from datetime import date, timedelta
from typing import Iterable, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.areas import AREA_SLUGS
from app.models.checkin import DailyCheckin
from app.services import scoring
from app.services.dates import day_range


async def load_checkins(db: AsyncSession, user_id: int, start: date, end: date) -> dict[date, DailyCheckin]:
    rows = await db.scalars(
        select(DailyCheckin).where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date >= start,
            DailyCheckin.checkin_date <= end,
        )
    )
    return {c.checkin_date: c for c in rows.all()}


def area_scores(checkin: Optional[DailyCheckin]) -> dict[str, Optional[int]]:
    return {s: (getattr(checkin, f"score_{s}") if checkin else None) for s in AREA_SLUGS}


def daily_points(rows: dict[date, DailyCheckin], days: Iterable[date], selected: Iterable[str]) -> list[dict]:
    """One point per calendar day; days without a check-in are all-null (a gap, not a zero)."""
    selected = list(selected)
    points = []
    for d in days:
        c = rows.get(d)
        areas = area_scores(c)
        points.append({
            "date": d,
            "life_score": scoring.life_score(areas, selected),
            "mood": c.mood if c else None,
            "energy": c.energy if c else None,
            "areas": areas,
        })
    return points


def moving_average(values: list[Optional[float]], window: int = 7) -> list[Optional[float]]:
    """Trailing mean over `window` days, skipping gaps. None only when the whole window is empty."""
    out: list[Optional[float]] = []
    for i in range(len(values)):
        chunk = values[max(0, i - window + 1): i + 1]
        out.append(scoring.mean(chunk))
    return out


async def checkin_trend(db: AsyncSession, user_id: int, selected: Iterable[str], days: int, today: date) -> dict:
    """Life Score, mood, energy and per-area scores per day, plus a 7-day moving average."""
    selected = list(selected)
    window = day_range(today, days)
    rows = await load_checkins(db, user_id, window[0] - timedelta(days=6), today)
    # Compute over the extra 6 days before the range so the first moving-average points are real.
    padded = daily_points(rows, day_range(today, days + 6), selected)
    ma = moving_average([p["life_score"] for p in padded], 7)[6:]
    points = padded[6:]
    return {
        "points": points,
        "moving_avg_7": [{"date": p["date"], "value": v} for p, v in zip(points, ma)],
    }


async def period_comparison(db: AsyncSession, user_id: int, selected: Iterable[str], days: int, today: date) -> dict:
    """Averages for the last `days` days and for the `days` before that.

    Returns {"current": {...}, "previous": {...}} where each has "life_score" and "areas",
    plus "points": the per-day points of the current period.
    """
    selected = list(selected)
    current_days = day_range(today, days)
    previous_days = day_range(current_days[0] - timedelta(days=1), days)
    rows = await load_checkins(db, user_id, previous_days[0], today)
    cur = daily_points(rows, current_days, selected)
    prev = daily_points(rows, previous_days, selected)

    def summarize(points: list[dict]) -> dict:
        return {
            "life_score": scoring.mean(p["life_score"] for p in points),
            "areas": {s: scoring.mean(p["areas"][s] for p in points) for s in AREA_SLUGS},
        }

    return {"current": summarize(cur), "previous": summarize(prev), "points": cur}


async def completed_dates(db: AsyncSession, user_id: int) -> set[date]:
    rows = await db.scalars(
        select(DailyCheckin.checkin_date).where(DailyCheckin.user_id == user_id, DailyCheckin.is_complete.is_(True))
    )
    return set(rows.all())


def checkin_streak(done: set[date], today: date) -> int:
    """Consecutive days with a completed check-in. Today not being done yet doesn't break it."""
    day = today if today in done else today - timedelta(days=1)
    streak = 0
    while day in done:
        streak += 1
        day -= timedelta(days=1)
    return streak
