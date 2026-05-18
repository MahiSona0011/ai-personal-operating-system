from datetime import date
from typing import Optional
from sqlalchemy import String, BigInteger, Date, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class Metric(Base, TimestampMixin):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    life_area_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("life_areas.id"), nullable=False)
    metric_key: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_date: Mapped[date] = mapped_column(Date, nullable=False)
    value_numeric: Mapped[Optional[float]] = mapped_column(Numeric(12, 4), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, key="metadata_")
