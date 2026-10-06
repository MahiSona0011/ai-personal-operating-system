from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, field_validator


class CheckinScores(BaseModel):
    score_health: Optional[int] = None
    score_mind: Optional[int] = None
    score_relationships: Optional[int] = None
    score_work: Optional[int] = None
    score_money: Optional[int] = None
    score_growth: Optional[int] = None

    @field_validator(
        "score_health", "score_mind", "score_relationships",
        "score_work", "score_money", "score_growth",
        mode="before"
    )
    @classmethod
    def validate_score(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Score must be between 1 and 10")
        return v


class MoodEnergy(BaseModel):
    """Mood and energy are rated 1-10, like the area scores."""
    mood: Optional[int] = None
    energy: Optional[int] = None

    @field_validator("mood", "energy", mode="before")
    @classmethod
    def validate_1_to_10(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Value must be between 1 and 10")
        return v


class CreateCheckinRequest(CheckinScores, MoodEnergy):
    checkin_date: date
    wins: Optional[list[str]] = None
    blockers: Optional[list[str]] = None
    action_plan: Optional[list[str]] = None


class UpdateCheckinRequest(CheckinScores, MoodEnergy):
    wins: Optional[list[str]] = None
    blockers: Optional[list[str]] = None
    action_plan: Optional[list[str]] = None


class CheckinResponse(BaseModel):
    id: int
    user_id: int
    checkin_date: date
    score_health: Optional[int]
    score_mind: Optional[int]
    score_relationships: Optional[int]
    score_work: Optional[int]
    score_money: Optional[int]
    score_growth: Optional[int]
    overall_score: Optional[float]
    mood: Optional[int]
    energy: Optional[int]
    wins: Optional[list]
    blockers: Optional[list]
    action_plan: Optional[list]
    ai_analysis: Optional[dict]
    ai_analyzed_at: Optional[datetime]
    is_complete: bool
    completed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class CheckinTrendPoint(BaseModel):
    """One calendar day. Every value is None on a day without a check-in."""
    date: date
    life_score: Optional[float]
    mood: Optional[int]
    energy: Optional[int]
    areas: dict[str, Optional[int]]


class MovingAveragePoint(BaseModel):
    date: date
    value: Optional[float]


class CheckinTrendResponse(BaseModel):
    points: list[CheckinTrendPoint]
    moving_avg_7: list[MovingAveragePoint]
