from datetime import date, datetime, timedelta, timezone
from typing import Iterable, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checkin import DailyCheckin
from app.schemas.checkin import CreateCheckinRequest, UpdateCheckinRequest
from app.services import scoring

AREA_SCORE_FIELDS = (
    "score_health", "score_mind", "score_relationships",
    "score_work", "score_money", "score_growth",
)


def compute_overall_score(checkin: DailyCheckin, selected: Optional[Iterable[str]] = None) -> Optional[float]:
    """Life Score (1-10) for a check-in. The definition lives in services/scoring.py."""
    scores = {f.removeprefix("score_"): getattr(checkin, f) for f in AREA_SCORE_FIELDS}
    return scoring.life_score(scores, selected)


async def get_or_create_today(db: AsyncSession, user_id: int, today: Optional[date] = None) -> DailyCheckin:
    today = today or date.today()
    existing = await db.scalar(
        select(DailyCheckin).where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date == today,
        )
    )
    if existing:
        return existing

    checkin = DailyCheckin(user_id=user_id, checkin_date=today)
    db.add(checkin)
    await db.flush()
    return checkin


async def create_checkin(
    db: AsyncSession, user_id: int, data: CreateCheckinRequest, selected: Optional[Iterable[str]] = None
) -> DailyCheckin:
    existing = await db.scalar(
        select(DailyCheckin).where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date == data.checkin_date,
        )
    )
    if existing:
        return await update_checkin(
            db, existing, UpdateCheckinRequest(**data.model_dump(exclude={"checkin_date"}, exclude_unset=True)), selected
        )

    checkin = DailyCheckin(user_id=user_id, **data.model_dump())
    checkin.overall_score = compute_overall_score(checkin, selected)
    db.add(checkin)
    await db.flush()
    return checkin


async def update_checkin(
    db: AsyncSession, checkin: DailyCheckin, data: UpdateCheckinRequest, selected: Optional[Iterable[str]] = None
) -> DailyCheckin:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(checkin, field, value)
    checkin.overall_score = compute_overall_score(checkin, selected)
    await db.flush()
    return checkin


async def complete_checkin(
    db: AsyncSession, checkin: DailyCheckin, selected: Optional[Iterable[str]] = None
) -> DailyCheckin:
    checkin.is_complete = True
    checkin.completed_at = datetime.now(timezone.utc)
    checkin.overall_score = compute_overall_score(checkin, selected)
    await db.flush()
    return checkin


async def get_trend(db: AsyncSession, user_id: int, days: int = 30, today: Optional[date] = None) -> list[DailyCheckin]:
    cutoff = (today or date.today()) - timedelta(days=days)
    result = await db.scalars(
        select(DailyCheckin)
        .where(DailyCheckin.user_id == user_id, DailyCheckin.checkin_date >= cutoff)
        .order_by(DailyCheckin.checkin_date)
    )
    return list(result.all())
