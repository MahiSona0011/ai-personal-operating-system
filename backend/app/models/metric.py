from datetime import date
from typing import Optional
from sqlalchemy import String, BigInteger, Date, Index, Numeric, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin
from app.models.base import PK_TYPE


class Metric(Base, TimestampMixin):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    life_area_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("life_areas.id"), nullable=False)
    metric_key: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_date: Mapped[date] = mapped_column(Date, nullable=False)
    value_numeric: Mapped[Optional[float]] = mapped_column(Numeric(12, 4), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, key="metadata_")

    # Serves /metrics/series and the area summary: one user, one metric key, a date range.
    __table_args__ = (
        Index("ix_metrics_user_area_key_date", "user_id", "life_area_id", "metric_key", "metric_date"),
    )
