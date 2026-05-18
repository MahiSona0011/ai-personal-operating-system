from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


SESSION_TYPES = ("deep_work", "learning", "exercise", "reading", "practice", "meeting", "other")


class CreateSessionRequest(BaseModel):
    life_area_id: int
    goal_id: Optional[int] = None
    session_type: str = "deep_work"
    title: str
    notes: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    quality_rating: Optional[int] = None

    @field_validator("session_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in SESSION_TYPES:
            raise ValueError(f"session_type must be one of {SESSION_TYPES}")
        return v

    @field_validator("quality_rating")
    @classmethod
    def validate_quality(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("quality_rating must be 1–5")
        return v


class UpdateSessionRequest(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    quality_rating: Optional[int] = None
    goal_id: Optional[int] = None

    @field_validator("quality_rating")
    @classmethod
    def validate_quality(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("quality_rating must be 1–5")
        return v


class SessionResponse(BaseModel):
    id: int
    user_id: int
    life_area_id: int
    goal_id: Optional[int]
    session_type: str
    title: str
    notes: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    duration_minutes: Optional[int]
    quality_rating: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionStatsResponse(BaseModel):
    total_minutes: int
    session_count: int
    avg_quality: Optional[float]
    by_area: dict[str, int]    # life_area_id (str) -> total minutes
    by_week: list[dict]        # [{week_start: str, minutes: int, count: int}]
