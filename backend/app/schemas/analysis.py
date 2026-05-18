from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class OnDemandRequest(BaseModel):
    question: str
    context_areas: list[str] = []
    include_recent_data: bool = True


class WeeklyReviewRequest(BaseModel):
    week_start: date


class ActionItem(BaseModel):
    action: str
    area: str
    priority: int = 2


class RecommendationResponse(BaseModel):
    id: int
    user_id: int
    recommendation_type: str
    source_type: Optional[str]
    source_id: Optional[int]
    model_used: str
    prompt_tokens: Optional[int]
    completion_tokens: Optional[int]
    raw_response: dict
    summary: Optional[str]
    action_items: Optional[list]
    insights: Optional[list]
    is_dismissed: bool
    is_actioned: bool
    user_rating: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateRecommendationRequest(BaseModel):
    is_dismissed: Optional[bool] = None
    is_actioned: Optional[bool] = None
    user_rating: Optional[int] = None


class WeeklyReviewResponse(BaseModel):
    id: int
    user_id: int
    week_start_date: date
    week_end_date: date
    avg_scores: dict
    habit_completion_rate: Optional[float]
    total_session_minutes: Optional[int]
    ai_narrative: Optional[str]
    highlights: Optional[list]
    improvement_areas: Optional[list]
    generation_status: str
    generated_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}
