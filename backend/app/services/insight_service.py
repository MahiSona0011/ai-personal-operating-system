"""Read-side helpers for AI recommendations shown on the dashboard and area pages."""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.areas import AREA_SLUG_BY_ID
from app.models.ai_recommendation import AIRecommendation
from app.schemas.analysis import RecommendationResponse


def _text(item) -> Optional[str]:
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        for k in ("insight", "text", "title", "summary"):
            if isinstance(item.get(k), str):
                return item[k]
    return None


def _first_action(rec: AIRecommendation) -> Optional[dict]:
    for a in rec.action_items or []:
        if isinstance(a, dict) and isinstance(a.get("action"), str):
            return {"action": a["action"], "area": a.get("area"), "priority": a.get("priority", 2)}
    return None


def _top_insight(rec: AIRecommendation) -> Optional[str]:
    raw = rec.raw_response if isinstance(rec.raw_response, dict) else {}
    if isinstance(raw.get("top_insight"), str):
        return raw["top_insight"]
    for item in rec.insights or []:
        if _text(item):
            return _text(item)
    return None


def serialize(rec: AIRecommendation) -> dict:
    return {
        "id": rec.id,
        "type": rec.recommendation_type,
        "summary": rec.summary,
        "insight": _top_insight(rec),
        "action": _first_action(rec),
        "action_items": rec.action_items or [],
        "created_at": rec.created_at,
    }


async def latest_insight(db: AsyncSession, user_id: int) -> Optional[dict]:
    rec = await db.scalar(
        select(AIRecommendation)
        .where(AIRecommendation.user_id == user_id, AIRecommendation.is_dismissed.is_(False))
        .order_by(AIRecommendation.created_at.desc(), AIRecommendation.id.desc())
        .limit(1)
    )
    return serialize(rec) if rec else None


async def recommendations_for_area(db: AsyncSession, user_id: int, area_id: int, limit: int = 3) -> list[dict]:
    """Latest recommendations tagged to the area, either directly or through an action item's area."""
    slug = AREA_SLUG_BY_ID[area_id]
    rows = await db.scalars(
        select(AIRecommendation)
        .where(AIRecommendation.user_id == user_id, AIRecommendation.is_dismissed.is_(False))
        .order_by(AIRecommendation.created_at.desc(), AIRecommendation.id.desc())
        .limit(50)
    )
    out = []
    for rec in rows.all():
        tagged = rec.life_area_id == area_id or any(
            isinstance(a, dict) and a.get("area") == slug for a in rec.action_items or []
        )
        if tagged:
            # The full recommendation, so the area page can render the same InsightCard as /analysis.
            out.append(RecommendationResponse.model_validate(rec).model_dump(mode="json"))
        if len(out) >= limit:
            break
    return out
