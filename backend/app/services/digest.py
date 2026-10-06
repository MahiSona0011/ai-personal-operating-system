"""What goes in a user's weekly digest email. Same numbers as the dashboard (7-day window), no AI call."""
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.areas import AREA_SLUGS
from app.models.ai_recommendation import WeeklyReview
from app.models.user import User
from app.services import highlights, scoring, signals, trends

DAYS = 7
NARRATIVE_CHARS = 280
REVIEW_MAX_AGE_DAYS = 14  # an older review is no longer "this week's"


def _excerpt(text: Optional[str]) -> Optional[str]:
    if not text or not text.strip():
        return None
    text = " ".join(text.split())
    return text if len(text) <= NARRATIVE_CHARS else text[: NARRATIVE_CHARS - 1].rstrip() + "…"


async def build_digest(db: AsyncSession, user: User, today: date) -> dict:
    """Life Score and its change, best/worst area, highlights and the AI narrative if a review exists."""
    selected = scoring.selected_area_slugs(user.preferences)
    comparison = await trends.period_comparison(db, user.id, selected, DAYS, today)
    cur, prev = comparison["current"], comparison["previous"]

    areas = {
        slug: {"score": cur["areas"][slug], "delta": scoring.delta(cur["areas"][slug], prev["areas"][slug])}
        for slug in AREA_SLUGS
    }
    rated = [(slug, areas[slug]["score"]) for slug in selected if areas[slug]["score"] is not None]
    best = max(rated, key=lambda r: r[1]) if rated else None
    worst = min(rated, key=lambda r: r[1]) if len(rated) > 1 else None

    streak = trends.checkin_streak(await trends.completed_dates(db, user.id), today)
    consistency = await signals.consistency(db, user.id, days=DAYS, today=today)

    review = await db.scalar(
        select(WeeklyReview)
        .where(
            WeeklyReview.user_id == user.id,
            WeeklyReview.generation_status == "completed",
            WeeklyReview.week_start_date >= today - timedelta(days=REVIEW_MAX_AGE_DAYS),
        )
        .order_by(WeeklyReview.week_start_date.desc())
    )

    return {
        "life_score": cur["life_score"],
        "life_score_delta": scoring.delta(cur["life_score"], prev["life_score"]),
        "best_area": {"slug": best[0], "score": best[1]} if best else None,
        "worst_area": {"slug": worst[0], "score": worst[1]} if worst else None,
        "highlights": highlights.build_highlights(areas, consistency["rate"], streak, DAYS),
        "narrative": _excerpt(review.ai_narrative) if review else None,
    }
