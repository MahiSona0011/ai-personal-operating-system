from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Text, SmallInteger, BigInteger, Date, DateTime, Boolean, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin
from app.models.base import PK_TYPE


class Habit(Base, TimestampMixin):
    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    life_area_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("life_areas.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="daily")
    frequency_days: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    target_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_completions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_completed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    logs: Mapped[list["HabitLog"]] = relationship(back_populates="habit", cascade="all, delete-orphan")


class HabitLog(Base, TimestampMixin):
    __tablename__ = "habit_logs"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    habit_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("habits.id", ondelete="CASCADE"), nullable=False)
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    completion_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)

    habit: Mapped["Habit"] = relationship(back_populates="logs")

    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint("habit_id", "log_date", name="uq_habit_log_date"),
    )
