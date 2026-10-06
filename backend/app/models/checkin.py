from datetime import datetime, date
from typing import Optional
from sqlalchemy import BigInteger, Date, DateTime, Boolean, Numeric, SmallInteger, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin
from app.models.base import PK_TYPE


class DailyCheckin(Base, TimestampMixin):
    __tablename__ = "daily_checkins"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    checkin_date: Mapped[date] = mapped_column(Date, nullable=False)

    score_health: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    score_mind: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    score_relationships: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    score_work: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    score_money: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    score_growth: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    # The pre-6-area scores of check-ins that existed when the areas were merged (migration b4c5d6e7f8a9).
    legacy_area_scores: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    overall_score: Mapped[Optional[float]] = mapped_column(Numeric(4, 2), nullable=True)

    mood: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    energy: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    wins: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    blockers: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    action_plan: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ai_analysis: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ai_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint("user_id", "checkin_date", name="uq_checkin_user_date"),
    )
