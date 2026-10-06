from datetime import date
from typing import Optional
from sqlalchemy import String, Text, BigInteger, Date, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin
from app.models.base import PK_TYPE


class JournalEntry(Base, TimestampMixin):
    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    life_area_tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    mood_tag: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_themes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ai_sentiment: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # pending (queued) | completed | failed | skipped (too short, or the daily AI cap was reached)
    ai_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    deleted_at: Mapped[Optional[__import__("datetime").datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
