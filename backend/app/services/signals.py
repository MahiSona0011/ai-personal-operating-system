"""Measured signals that replaced the self-rated Discipline and Focus areas.

consistency: how much of what you planned to do you actually did (from habit_logs).
focus:       how much deep work you did and how good it was (from sessions).
"""
from datetime import date, datetime, time, timedelta, timezone
from math import ceil
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.habit import Habit, HabitLog
from app.models.session import WorkSession


def expected_completions(habit: Habit, start: date, end: date) -> int:
    """How many completions the habit asked for between start and end (inclusive).

    Counted from the day the habit was created, so a new habit doesn't drag the rate down.
    """
    created = habit.created_at.date() if habit.created_at else start
    start = max(start, created)
    if start > end:
        return 0
    days = (end - start).days + 1
    if habit.frequency_days:
        wanted = set(habit.frequency_days)
        return sum(1 for i in range(days) if (start + timedelta(days=i)).weekday() in wanted)
    if habit.frequency == "weekly":
        return ceil(days / 7) * (habit.target_count or 1)
    return days


async def consistency(db: AsyncSession, user_id: int, days: int = 7, today: Optional[date] = None) -> dict:
    """Habit completion over the last `days` days, ending today.

    Returns {"rate": 0-100 or None, "completed": int, "expected": int, "best_streak": int}.
    `rate` is None when there is nothing to measure (no active habits).
    """
    end = today or date.today()
    start = end - timedelta(days=days - 1)
    habits = list((await db.scalars(
        select(Habit).where(Habit.user_id == user_id, Habit.is_active.is_(True), Habit.deleted_at.is_(None))
    )).all())
    if not habits:
        return {"rate": None, "completed": 0, "expected": 0, "best_streak": 0}

    ids = [h.id for h in habits]
    completed_pairs = (await db.execute(
        select(HabitLog.habit_id, HabitLog.log_date)
        .where(HabitLog.habit_id.in_(ids), HabitLog.log_date >= start, HabitLog.log_date <= end,
               HabitLog.status == "completed")
        .distinct()
    )).all()
    completed = len(completed_pairs)
    expected = sum(expected_completions(h, start, end) for h in habits)
    rate = round(min(completed, expected) / expected * 100, 1) if expected else None
    return {
        "rate": rate,
        "completed": completed,
        "expected": expected,
        "best_streak": max((h.current_streak for h in habits), default=0),
    }


async def focus(db: AsyncSession, user_id: int, days: int = 7, today: Optional[date] = None) -> dict:
    """Deep-work minutes and average session quality over the last `days` days, ending today.

    Returns {"deep_work_minutes": int, "sessions": int, "avg_quality": float | None}.
    """
    end = today or date.today()
    start = datetime.combine(end - timedelta(days=days - 1), time.min, tzinfo=timezone.utc)
    stop = datetime.combine(end + timedelta(days=1), time.min, tzinfo=timezone.utc)
    minutes, count, quality = (await db.execute(
        select(
            func.coalesce(func.sum(WorkSession.duration_minutes), 0),
            func.count(WorkSession.id),
            func.avg(WorkSession.quality_rating),
        ).where(
            WorkSession.user_id == user_id,
            WorkSession.session_type == "deep_work",
            WorkSession.deleted_at.is_(None),
            WorkSession.started_at >= start,
            WorkSession.started_at < stop,
        )
    )).one()
    return {
        "deep_work_minutes": int(minutes or 0),
        "sessions": int(count or 0),
        "avg_quality": round(float(quality), 1) if quality is not None else None,
    }
