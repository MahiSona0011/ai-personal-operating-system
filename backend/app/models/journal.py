from datetime import date
from typing import Optional
from sqlalchemy import String, Text, BigInteger, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class JournalEntry(Base, TimestampMixin):
    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    life_area_tags: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    mood_tag: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_themes: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    ai_sentiment: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    deleted_at: Mapped[Optional[__import__("datetime").datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
