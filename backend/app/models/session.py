from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, SmallInteger, BigInteger, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin
from app.models.base import PK_TYPE


class WorkSession(Base, TimestampMixin):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    life_area_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("life_areas.id"), nullable=False)
    goal_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("goals.id"), nullable=True)
    session_type: Mapped[str] = mapped_column(String(50), nullable=False, default="deep_work")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    quality_rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
