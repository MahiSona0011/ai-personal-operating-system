import json
import logging
from datetime import date, datetime, timezone, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import get_client
from app.ai.prompt_builder import build_daily_context, build_weekly_context, build_on_demand_context
from app.ai import response_parser
from app.ai.prompts import daily_analysis, weekly_review, on_demand as on_demand_prompts
from app.core.config import settings
from app.models.checkin import DailyCheckin
from app.models.ai_recommendation import AIRecommendation, WeeklyReview

logger = logging.getLogger(__name__)


async def analyze_checkin(db: AsyncSession, checkin_id: int, user_id: int) -> None:
    checkin = await db.scalar(
        select(DailyCheckin).where(DailyCheckin.id == checkin_id, DailyCheckin.user_id == user_id)
    )
    if not checkin:
        logger.error("analyze_checkin: checkin %d not found", checkin_id)
        return

    ctx = await build_daily_context(db, checkin, user_id)

    client = get_client()
    try:
        msg = await client.messages.create(
            model=settings.AI_MODEL_FAST,
            max_tokens=1024,
            system=[
                {
                    "type": "text",
                    "text": daily_analysis.SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": daily_analysis.USER_TEMPLATE.format(**ctx)}],
        )
        raw_text = msg.content[0].text
        parsed = response_parser.parse_daily(raw_text)

        checkin.ai_analysis = parsed
        checkin.ai_analyzed_at = datetime.now(timezone.utc)
        await db.flush()

        rec = AIRecommendation(
            user_id=user_id,
            recommendation_type="daily_analysis",
            source_type="checkin",
            source_id=checkin_id,
            model_used=settings.AI_MODEL_FAST,
            prompt_tokens=msg.usage.input_tokens,
            completion_tokens=msg.usage.output_tokens,
            raw_response=parsed,
            summary=parsed.get("summary"),
            action_items=parsed.get("action_items"),
            insights=parsed.get("patterns"),
        )
        db.add(rec)
        await db.commit()
        logger.info("Daily analysis complete for checkin %d", checkin_id)

    except Exception as exc:
        logger.error("analyze_checkin failed: %s", exc, exc_info=True)
        await db.rollback()


async def generate_weekly_review(db: AsyncSession, user_id: int, week_start: date) -> WeeklyReview | None:
    week_end = week_start + timedelta(days=6)

    existing = await db.scalar(
        select(WeeklyReview).where(
            WeeklyReview.user_id == user_id,
            WeeklyReview.week_start_date == week_start,
        )
    )
    if existing and existing.generation_status == "completed":
        return existing

    if not existing:
        existing = WeeklyReview(
            user_id=user_id,
            week_start_date=week_start,
            week_end_date=week_end,
            avg_scores={},
            generation_status="in_progress",
        )
        db.add(existing)
        await db.flush()
    else:
        existing.generation_status = "in_progress"
        await db.flush()

    ctx = await build_weekly_context(db, user_id, week_start, week_end)

    client = get_client()
    try:
        msg = await client.messages.create(
            model=settings.AI_MODEL_QUALITY,
            max_tokens=2048,
            system=[
                {
                    "type": "text",
                    "text": weekly_review.SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": weekly_review.USER_TEMPLATE.format(**ctx)}],
        )
        parsed = response_parser.parse_weekly(msg.content[0].text)

        existing.avg_scores = ctx["avg_scores"] if isinstance(ctx["avg_scores"], dict) else {}
        existing.habit_completion_rate = ctx["habit_rate"]
        existing.total_session_minutes = ctx["session_minutes"]
        existing.ai_narrative = parsed.get("narrative")
        existing.highlights = parsed.get("highlights")
        existing.improvement_areas = parsed.get("improvement_areas")
        existing.generation_status = "completed"
        existing.generated_at = datetime.now(timezone.utc)

        rec = AIRecommendation(
            user_id=user_id,
            recommendation_type="weekly_review",
            source_type="weekly_review",
            source_id=existing.id,
            model_used=settings.AI_MODEL_QUALITY,
            prompt_tokens=msg.usage.input_tokens,
            completion_tokens=msg.usage.output_tokens,
            raw_response=parsed,
            summary=parsed.get("narrative", "")[:500] if parsed.get("narrative") else None,
            action_items=[{"action": parsed.get("next_week_focus"), "area": "all", "priority": 1}]
            if parsed.get("next_week_focus")
            else None,
            insights=parsed.get("highlights"),
        )
        db.add(rec)
        await db.commit()
        return existing

    except Exception as exc:
        logger.error("generate_weekly_review failed: %s", exc, exc_info=True)
        existing.generation_status = "failed"
        await db.commit()
        return None


async def on_demand_analysis(
    db: AsyncSession,
    user_id: int,
    question: str,
    context_areas: list[str],
) -> AIRecommendation | None:
    ctx = await build_on_demand_context(db, user_id, context_areas)

    client = get_client()
    try:
        msg = await client.messages.create(
            model=settings.AI_MODEL_FAST,
            max_tokens=1024,
            system=[
                {
                    "type": "text",
                    "text": on_demand_prompts.SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": on_demand_prompts.USER_TEMPLATE.format(
                        question=question,
                        **ctx,
                    ),
                }
            ],
        )
        parsed = response_parser.parse_on_demand(msg.content[0].text)

        rec = AIRecommendation(
            user_id=user_id,
            recommendation_type="on_demand",
            model_used=settings.AI_MODEL_FAST,
            prompt_tokens=msg.usage.input_tokens,
            completion_tokens=msg.usage.output_tokens,
            raw_response=parsed,
            summary=parsed.get("answer"),
            action_items=parsed.get("action_items"),
        )
        db.add(rec)
        await db.commit()
        await db.refresh(rec)
        return rec

    except Exception as exc:
        logger.error("on_demand_analysis failed: %s", exc, exc_info=True)
        await db.rollback()
        return None
