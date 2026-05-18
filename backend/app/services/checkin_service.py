from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checkin import DailyCheckin
from app.schemas.checkin import CreateCheckinRequest, UpdateCheckinRequest

AREA_WEIGHTS = {
    "score_discipline": 0.15,
    "score_focus": 0.15,
    "score_learning": 0.12,
    "score_career": 0.13,
    "score_health": 0.15,
    "score_mental": 0.12,
    "score_social": 0.09,
    "score_financial": 0.09,
}


def compute_overall_score(checkin: DailyCheckin) -> Optional[float]:
    total_weight = 0.0
    weighted_sum = 0.0
    for field, weight in AREA_WEIGHTS.items():
        val = getattr(checkin, field)
        if val is not None:
            weighted_sum += val * weight
            total_weight += weight
    if total_weight == 0:
        return None
    return round(weighted_sum / total_weight, 2)


async def get_or_create_today(db: AsyncSession, user_id: int) -> DailyCheckin:
    today = date.today()
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


async def create_checkin(db: AsyncSession, user_id: int, data: CreateCheckinRequest) -> DailyCheckin:
    existing = await db.scalar(
        select(DailyCheckin).where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date == data.checkin_date,
        )
    )
    if existing:
        return await update_checkin(db, existing, UpdateCheckinRequest(**data.model_dump(exclude={"checkin_date"})))

    checkin = DailyCheckin(user_id=user_id, **data.model_dump())
    checkin.overall_score = compute_overall_score(checkin)
    db.add(checkin)
    await db.flush()
    return checkin


async def update_checkin(db: AsyncSession, checkin: DailyCheckin, data: UpdateCheckinRequest) -> DailyCheckin:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(checkin, field, value)
    checkin.overall_score = compute_overall_score(checkin)
    await db.flush()
    return checkin


async def complete_checkin(db: AsyncSession, checkin: DailyCheckin) -> DailyCheckin:
    checkin.is_complete = True
    checkin.completed_at = datetime.now(timezone.utc)
    checkin.overall_score = compute_overall_score(checkin)
    await db.flush()
    return checkin


async def get_trend(db: AsyncSession, user_id: int, days: int = 30) -> list[DailyCheckin]:
    from datetime import timedelta
    cutoff = date.today() - timedelta(days=days)
    result = await db.scalars(
        select(DailyCheckin)
        .where(DailyCheckin.user_id == user_id, DailyCheckin.checkin_date >= cutoff)
        .order_by(DailyCheckin.checkin_date)
    )
    return list(result.all())
