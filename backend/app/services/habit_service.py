from datetime import date, timedelta
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.habit import Habit, HabitLog
from app.schemas.habit import CreateHabitRequest, UpdateHabitRequest, LogHabitRequest


async def list_habits(db: AsyncSession, user_id: int, active_only: bool = True) -> list[Habit]:
    q = select(Habit).where(Habit.user_id == user_id, Habit.deleted_at.is_(None))
    if active_only:
        q = q.where(Habit.is_active.is_(True))
    result = await db.scalars(q.order_by(Habit.created_at))
    return list(result.all())


async def get_habits_with_today_status(db: AsyncSession, user_id: int) -> list[tuple[Habit, Optional[HabitLog]]]:
    today = date.today()
    habits = await list_habits(db, user_id)
    result = []
    for habit in habits:
        log = await db.scalar(
            select(HabitLog).where(HabitLog.habit_id == habit.id, HabitLog.log_date == today)
        )
        result.append((habit, log))
    return result


async def create_habit(db: AsyncSession, user_id: int, data: CreateHabitRequest) -> Habit:
    habit = Habit(user_id=user_id, **data.model_dump())
    db.add(habit)
    await db.flush()
    return habit


async def update_habit(db: AsyncSession, habit: Habit, data: UpdateHabitRequest) -> Habit:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(habit, field, value)
    await db.flush()
    return habit


async def log_completion(db: AsyncSession, habit: Habit, data: LogHabitRequest) -> HabitLog:
    existing = await db.scalar(
        select(HabitLog).where(HabitLog.habit_id == habit.id, HabitLog.log_date == data.log_date)
    )
    if existing:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(existing, field, value)
        log = existing
    else:
        log = HabitLog(user_id=habit.user_id, habit_id=habit.id, **data.model_dump())
        db.add(log)

    await db.flush()
    await _recalculate_streak(db, habit)
    return log


async def _recalculate_streak(db: AsyncSession, habit: Habit) -> None:
    logs = await db.scalars(
        select(HabitLog)
        .where(HabitLog.habit_id == habit.id, HabitLog.status == "completed")
        .order_by(HabitLog.log_date.desc())
    )
    log_dates = sorted({log.log_date for log in logs.all()}, reverse=True)

    if not log_dates:
        habit.current_streak = 0
        habit.last_completed_date = None
        await db.flush()
        return

    habit.last_completed_date = log_dates[0]
    habit.total_completions = len(log_dates)

    # Current streak: count consecutive days from today/yesterday
    today = date.today()
    streak = 0
    expected = today if log_dates[0] == today else today - timedelta(days=1)

    for d in log_dates:
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        else:
            break

    habit.current_streak = streak
    if streak > habit.longest_streak:
        habit.longest_streak = streak

    await db.flush()


async def get_log_history(db: AsyncSession, habit_id: int, days: int = 84) -> list[HabitLog]:
    start_date = date.today() - timedelta(days=days - 1)
    result = await db.scalars(
        select(HabitLog)
        .where(HabitLog.habit_id == habit_id, HabitLog.log_date >= start_date)
        .order_by(HabitLog.log_date)
    )
    return list(result.all())


async def soft_delete(db: AsyncSession, habit: Habit) -> None:
    from datetime import datetime, timezone
    habit.deleted_at = datetime.now(timezone.utc)
    await db.flush()
