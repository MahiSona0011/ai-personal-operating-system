from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class CreateGoalRequest(BaseModel):
    life_area_id: int
    title: str
    description: Optional[str] = None
    why: Optional[str] = None
    priority: int = 2
    target_date: Optional[date] = None


class UpdateGoalRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    why: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    progress_pct: Optional[float] = None
    target_date: Optional[date] = None


class MilestoneResponse(BaseModel):
    id: int
    goal_id: int
    title: str
    is_completed: bool
    completed_at: Optional[datetime]
    due_date: Optional[date]
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class GoalResponse(BaseModel):
    id: int
    user_id: int
    life_area_id: int
    title: str
    description: Optional[str]
    why: Optional[str]
    status: str
    priority: int
    progress_pct: float
    target_date: Optional[date]
    completed_at: Optional[datetime]
    created_at: datetime
    milestones: list[MilestoneResponse] = []

    model_config = {"from_attributes": True}


class CreateMilestoneRequest(BaseModel):
    title: str
    due_date: Optional[date] = None
    sort_order: int = 0
