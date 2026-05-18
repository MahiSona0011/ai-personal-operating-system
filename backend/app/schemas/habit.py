from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class CreateHabitRequest(BaseModel):
    life_area_id: int
    title: str
    description: Optional[str] = None
    frequency: str = "daily"
    frequency_days: Optional[list[int]] = None
    target_count: int = 1


class UpdateHabitRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    frequency_days: Optional[list[int]] = None
    target_count: Optional[int] = None
    is_active: Optional[bool] = None


class HabitResponse(BaseModel):
    id: int
    user_id: int
    life_area_id: int
    title: str
    description: Optional[str]
    frequency: str
    frequency_days: Optional[list]
    target_count: int
    current_streak: int
    longest_streak: int
    total_completions: int
    last_completed_date: Optional[date]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class HabitWithTodayStatus(HabitResponse):
    completed_today: bool = False
    completion_count_today: int = 0


class LogHabitRequest(BaseModel):
    log_date: date
    completion_count: int = 1
    status: str = "completed"
    notes: Optional[str] = None
    duration_minutes: Optional[int] = None


class HabitLogResponse(BaseModel):
    id: int
    habit_id: int
    log_date: date
    completion_count: int
    status: str
    notes: Optional[str]
    duration_minutes: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class StreakResponse(BaseModel):
    habit_id: int
    current_streak: int
    longest_streak: int
    total_completions: int
    last_completed_date: Optional[date]


class HabitLogHistoryItem(BaseModel):
    log_date: date
    completion_count: int
    status: str

    model_config = {"from_attributes": True}
