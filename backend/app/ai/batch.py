"""Weekly-review batch: one review per verified, active user per week, run by the scheduler."""
import asyncio
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ai import ai_service
from app.core.config import settings
from app.models.ai_recommendation import WeeklyReview
from app.models.checkin import DailyCheckin
from app.models.user import User
from app.services import ai_quota
from app.services.dates import review_week_start, user_today

logger = logging.getLogger(__name__)

# A review marked in_progress or pending this recently is assumed to be running; older ones are retried.
RUNNING_GRACE = timedelta(minutes=15)


async def _skip_reason(db: AsyncSession, user_id: int, week_start: date, now: datetime) -> Optional[str]:
    review = await db.scalar(
        select(WeeklyReview).where(WeeklyReview.user_id == user_id, WeeklyReview.week_start_date == week_start)
    )
    if review is not None:
        if review.generation_status == "completed":
            return "has_review"
        if review.generation_status in ("in_progress", "pending"):
            touched = review.updated_at if review.updated_at.tzinfo else review.updated_at.replace(tzinfo=timezone.utc)
            if now - touched < RUNNING_GRACE:
                return "has_review"

    checkins = await db.scalar(
        select(func.count(DailyCheckin.id)).where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date >= week_start,
            DailyCheckin.checkin_date <= week_start + timedelta(days=6),
            DailyCheckin.is_complete.is_(True),
        )
    )
    if not checkins:
        return "no_data"

    if not await ai_quota.has_quota(db, user_id):
        return "over_cap"
    return None


async def generate_all_weekly(
    session_factory: async_sessionmaker,
    *,
    week_start: Optional[date] = None,
    delay: Optional[float] = None,
    now: Optional[datetime] = None,
) -> dict[str, int]:
    """Generate the weekly review for every verified, active user who doesn't have one yet.

    Sequential, with a pause between AI calls. Safe to run twice: a user whose review for the week
    exists (or is being generated) is skipped, and the table's unique constraint backs that up.
    A failed review is retried on the next run. `week_start` defaults to each user's own just-ended week.
    """
    now = now or datetime.now(timezone.utc)
    pause = settings.AI_BATCH_DELAY_SECONDS if delay is None else delay
    counts = {"generated": 0, "failed": 0, "has_review": 0, "no_data": 0, "over_cap": 0}

    async with session_factory() as db:
        users = (
            await db.execute(
                select(User.id, User.timezone).where(
                    User.is_active.is_(True),
                    User.deleted_at.is_(None),
                    User.email_verified_at.is_not(None),
                ).order_by(User.id)
            )
        ).all()

    first = True
    for user_id, tz in users:
        week = week_start or review_week_start(user_today(tz, now))
        try:
            async with session_factory() as db:
                reason = await _skip_reason(db, user_id, week, now)
                if reason:
                    counts[reason] += 1
                    continue
                if not first and pause:
                    await asyncio.sleep(pause)
                first = False
                review = await ai_service.generate_weekly_review(db, user_id, week)
                counts["generated" if review is not None else "failed"] += 1
        except Exception:  # one user's trouble must not stop the rest
            logger.exception("weekly batch: user %d failed", user_id)
            counts["failed"] += 1

    logger.info("weekly batch finished: %s", counts)
    return counts
