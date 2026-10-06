"""Metric series for charts: one point per day that has data (several entries on a day are averaged)."""
from collections import defaultdict
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.metric import Metric
from app.services import scoring


async def metric_series(
    db: AsyncSession, user_id: int, key: str, area_id: Optional[int], days: int, today: date
) -> dict:
    start = today - timedelta(days=days - 1)
    prev_start = start - timedelta(days=days)
    q = select(Metric).where(
        Metric.user_id == user_id,
        Metric.metric_key == key,
        Metric.value_numeric.is_not(None),
        Metric.metric_date >= prev_start,
        Metric.metric_date <= today,
    )
    if area_id is not None:
        q = q.where(Metric.life_area_id == area_id)
    rows = list((await db.scalars(q.order_by(Metric.metric_date, Metric.created_at))).all())

    by_day: dict[date, list[float]] = defaultdict(list)
    unit: Optional[str] = None
    for m in rows:
        by_day[m.metric_date].append(float(m.value_numeric))
        unit = m.unit or unit

    current = [(d, vals) for d, vals in sorted(by_day.items()) if d >= start]
    previous = [vals for d, vals in by_day.items() if d < start]
    points = [{"date": d, "value": round(sum(v) / len(v), 4), "n": len(v)} for d, v in current]

    cur_avg = scoring.mean(p["value"] for p in points)
    prev_avg = scoring.mean(sum(v) / len(v) for v in previous)
    return {
        "key": key,
        "area_id": area_id,
        "days": days,
        "unit": unit,
        "points": points,
        "latest": points[-1] if points else None,
        "average": cur_avg,
        "delta": scoring.delta(cur_avg, prev_avg),
    }


async def latest_by_key(db: AsyncSession, user_id: int, area_id: int, limit_rows: int = 500) -> list[dict]:
    """The most recent value of every metric key the user has logged in an area."""
    rows = await db.scalars(
        select(Metric)
        .where(Metric.user_id == user_id, Metric.life_area_id == area_id, Metric.value_numeric.is_not(None))
        .order_by(Metric.metric_date.desc(), Metric.created_at.desc())
        .limit(limit_rows)
    )
    seen: dict[str, dict] = {}
    for m in rows.all():
        if m.metric_key not in seen:
            seen[m.metric_key] = {
                "key": m.metric_key,
                "unit": m.unit,
                "latest_value": float(m.value_numeric),
                "latest_date": m.metric_date,
            }
    return sorted(seen.values(), key=lambda r: r["key"])
