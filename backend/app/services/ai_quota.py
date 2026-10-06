"""The daily AI budget. Every AI call type records an AIRecommendation, so counting those counts everything."""
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.ai_recommendation import AIRecommendation


async def calls_today(db: AsyncSession, user_id: int) -> int:
    """AI calls this user has used on the current UTC day."""
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    used = await db.scalar(
        select(func.count(AIRecommendation.id)).where(
            AIRecommendation.user_id == user_id,
            AIRecommendation.created_at >= day_start,
        )
    )
    return used or 0


async def has_quota(db: AsyncSession, user_id: int) -> bool:
    return await calls_today(db, user_id) < settings.AI_MAX_DAILY_CALLS_PER_USER
