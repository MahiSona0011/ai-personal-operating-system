from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, BigInteger, DateTime, Boolean, Index, Integer, SmallInteger, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin
from app.models.base import PK_TYPE


class AIRecommendation(Base, TimestampMixin):
    __tablename__ = "ai_recommendations"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recommendation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    life_area_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("life_areas.id"), nullable=True)
    source_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    raw_response: Mapped[dict] = mapped_column(JSON, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    action_items: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    insights: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_actioned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    user_rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)

    # Latest-first reads for the dashboard insight, area pages and the daily AI quota count.
    __table_args__ = (
        Index("ix_ai_recommendations_user_created", "user_id", "created_at"),
    )


class WeeklyReview(Base, TimestampMixin):
    __tablename__ = "weekly_reviews"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start_date: Mapped[__import__("datetime").date] = mapped_column(__import__("sqlalchemy").Date, nullable=False)
    week_end_date: Mapped[__import__("datetime").date] = mapped_column(__import__("sqlalchemy").Date, nullable=False)
    avg_scores: Mapped[dict] = mapped_column(JSON, nullable=False)
    habit_completion_rate: Mapped[Optional[float]] = mapped_column(__import__("sqlalchemy").Numeric(5, 2), nullable=True)
    total_session_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ai_narrative: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    highlights: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    improvement_areas: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    generation_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint("user_id", "week_start_date", name="uq_weekly_review_user_week"),
    )
