from datetime import date

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DB, RangeDays, UserToday, ensure_life_area
from app.models.habit import Habit
from app.schemas.habit import (
    HabitResponse, HabitWithTodayStatus, CreateHabitRequest,
    UpdateHabitRequest, LogHabitRequest, HabitLogResponse, StreakResponse,
    HabitLogHistoryItem,
)
from app.services import habit_service, habit_stats

router = APIRouter(prefix="/habits", tags=["habits"])


async def _get_habit_or_404(db, user_id: int, habit_id: int) -> Habit:
    habit = await db.scalar(
        select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id, Habit.deleted_at.is_(None))
    )
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    return habit


@router.get("", response_model=list[HabitResponse])
async def list_habits(current_user: CurrentUser, db: DB):
    return await habit_service.list_habits(db, current_user.id)


@router.get("/completion")
async def completion(current_user: CurrentUser, db: DB, today: UserToday, days: RangeDays):
    """Daily completion-rate series for the last `days` days plus each habit's 30-day rate.

    `rate` is a 0-100 percentage, or null on days when no habit was due.
    """
    return await habit_stats.completion(db, current_user.id, days, today)


@router.get("/today", response_model=list[HabitWithTodayStatus])
async def habits_today(current_user: CurrentUser, db: DB):
    pairs = await habit_service.get_habits_with_today_status(db, current_user.id)
    result = []
    for habit, log in pairs:
        item = HabitWithTodayStatus.model_validate(habit)
        if log:
            item.completed_today = True
            item.completion_count_today = log.completion_count
        result.append(item)
    return result


@router.post("", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
async def create(data: CreateHabitRequest, current_user: CurrentUser, db: DB):
    await ensure_life_area(db, data.life_area_id)
    return await habit_service.create_habit(db, current_user.id, data)


@router.patch("/{habit_id}", response_model=HabitResponse)
async def update(habit_id: int, data: UpdateHabitRequest, current_user: CurrentUser, db: DB):
    habit = await _get_habit_or_404(db, current_user.id, habit_id)
    return await habit_service.update_habit(db, habit, data)


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(habit_id: int, current_user: CurrentUser, db: DB):
    habit = await _get_habit_or_404(db, current_user.id, habit_id)
    await habit_service.soft_delete(db, habit)


@router.post("/{habit_id}/log", response_model=HabitLogResponse)
async def log_completion(habit_id: int, data: LogHabitRequest, current_user: CurrentUser, db: DB):
    habit = await _get_habit_or_404(db, current_user.id, habit_id)
    return await habit_service.log_completion(db, habit, data)


@router.delete("/{habit_id}/log", status_code=status.HTTP_204_NO_CONTENT)
async def unlog(habit_id: int, log_date: date, current_user: CurrentUser, db: DB):
    """Remove the habit's log for `log_date`. Idempotent: 204 whether or not a log existed."""
    habit = await _get_habit_or_404(db, current_user.id, habit_id)
    await habit_service.remove_log(db, habit, log_date)


@router.get("/{habit_id}/logs", response_model=list[HabitLogHistoryItem])
async def get_logs(habit_id: int, current_user: CurrentUser, db: DB, days: int = 84):
    habit = await _get_habit_or_404(db, current_user.id, habit_id)
    return await habit_service.get_log_history(db, habit.id, days)


@router.get("/{habit_id}/streak", response_model=StreakResponse)
async def get_streak(habit_id: int, current_user: CurrentUser, db: DB):
    habit = await _get_habit_or_404(db, current_user.id, habit_id)
    return StreakResponse(
        habit_id=habit.id,
        current_streak=habit.current_streak,
        longest_streak=habit.longest_streak,
        total_completions=habit.total_completions,
        last_completed_date=habit.last_completed_date,
    )
