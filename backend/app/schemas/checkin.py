from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, field_validator


class CheckinScores(BaseModel):
    score_discipline: Optional[int] = None
    score_focus: Optional[int] = None
    score_learning: Optional[int] = None
    score_career: Optional[int] = None
    score_health: Optional[int] = None
    score_mental: Optional[int] = None
    score_social: Optional[int] = None
    score_financial: Optional[int] = None

    @field_validator(
        "score_discipline", "score_focus", "score_learning", "score_career",
        "score_health", "score_mental", "score_social", "score_financial",
        mode="before"
    )
    @classmethod
    def validate_score(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Score must be between 1 and 10")
        return v


class CreateCheckinRequest(CheckinScores):
    checkin_date: date
    mood: Optional[int] = None
    energy: Optional[int] = None
    wins: Optional[list[str]] = None
    blockers: Optional[list[str]] = None
    action_plan: Optional[list[str]] = None

    @field_validator("mood", "energy", mode="before")
    @classmethod
    def validate_1_to_5(cls, v):
        if v is not None and not (1 <= v <= 5):
            raise ValueError("Value must be between 1 and 5")
        return v


class UpdateCheckinRequest(CheckinScores):
    mood: Optional[int] = None
    energy: Optional[int] = None
    wins: Optional[list[str]] = None
    blockers: Optional[list[str]] = None
    action_plan: Optional[list[str]] = None


class CheckinResponse(BaseModel):
    id: int
    user_id: int
    checkin_date: date
    score_discipline: Optional[int]
    score_focus: Optional[int]
    score_learning: Optional[int]
    score_career: Optional[int]
    score_health: Optional[int]
    score_mental: Optional[int]
    score_social: Optional[int]
    score_financial: Optional[int]
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
    checkin_date: date
    overall_score: Optional[float]
    score_discipline: Optional[int]
    score_focus: Optional[int]
    score_learning: Optional[int]
    score_career: Optional[int]
    score_health: Optional[int]
    score_mental: Optional[int]
    score_social: Optional[int]
    score_financial: Optional[int]
