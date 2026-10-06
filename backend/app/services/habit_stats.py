"""Habit completion series for charts."""
from collections import defaultdict
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.habit import Habit, HabitLog
from app.services.dates import day_range
from app.services.signals import expected_completions

PER_HABIT_WINDOW = 30


def due_on(habit: Habit, day: date) -> bool:
    """Whether the habit was expected on `day`. Weekly-target habits have no fixed day, so never."""
    created = habit.created_at.date() if habit.created_at else day
    if day < created:
        return False
    if habit.frequency_days:
        return day.weekday() in set(habit.frequency_days)
    return habit.frequency != "weekly"


def _pct(done: int, expected: int) -> Optional[float]:
    return round(min(done, expected) / expected * 100, 1) if expected else None


async def active_habits(db: AsyncSession, user_id: int) -> list[Habit]:
    rows = await db.scalars(
        select(Habit).where(Habit.user_id == user_id, Habit.is_active.is_(True), Habit.deleted_at.is_(None))
        .order_by(Habit.created_at)
    )
    return list(rows.all())


async def completed_by_habit(db: AsyncSession, habit_ids: list[int], start: date, end: date) -> dict[int, set[date]]:
    if not habit_ids:
        return {}
    rows = await db.execute(
        select(HabitLog.habit_id, HabitLog.log_date).where(
            HabitLog.habit_id.in_(habit_ids),
            HabitLog.log_date >= start,
            HabitLog.log_date <= end,
            HabitLog.status == "completed",
        )
    )
    out: dict[int, set[date]] = defaultdict(set)
    for habit_id, log_date in rows.all():
        out[habit_id].add(log_date)
    return out


def habit_rates(habits: list[Habit], done: dict[int, set[date]], today: date) -> list[dict]:
    """Per-habit completion over the last 30 days."""
    start = today - timedelta(days=PER_HABIT_WINDOW - 1)
    out = []
    for h in habits:
        completed = sum(1 for d in done.get(h.id, set()) if start <= d <= today)
        expected = expected_completions(h, start, today)
        out.append({
            "habit_id": h.id,
            "title": h.title,
            "life_area_id": h.life_area_id,
            "current_streak": h.current_streak,
            "completed_30": completed,
            "expected_30": expected,
            "rate_30": _pct(completed, expected),
        })
    return out


async def completion(db: AsyncSession, user_id: int, days: int, today: date) -> dict:
    habits = await active_habits(db, user_id)
    window = max(days, PER_HABIT_WINDOW)
    done = await completed_by_habit(db, [h.id for h in habits], today - timedelta(days=window - 1), today)

    series = []
    total_due = total_done = 0
    for d in day_range(today, days):
        due = [h for h in habits if due_on(h, d)]
        completed = sum(1 for h in due if d in done.get(h.id, set()))
        total_due += len(due)
        total_done += completed
        series.append({"date": d, "rate": _pct(completed, len(due)), "completed": completed, "due": len(due)})

    return {
        "days": days,
        "overall_rate": _pct(total_done, total_due),
        "series": series,
        "habits": habit_rates(habits, done, today),
    }
