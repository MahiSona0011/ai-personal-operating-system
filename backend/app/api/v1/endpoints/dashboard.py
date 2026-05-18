import asyncio
from datetime import date, timedelta
from fastapi import APIRouter

from app.api.deps import CurrentUser, DB
from app.services import checkin_service, habit_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(current_user: CurrentUser, db: DB):
    today = date.today()
    week_ago = today - timedelta(days=7)

    checkin_task = checkin_service.get_or_create_today(db, current_user.id)
    habits_task = habit_service.get_habits_with_today_status(db, current_user.id)
    trend_task = checkin_service.get_trend(db, current_user.id, days=7)

    checkin, habit_pairs, trend = await asyncio.gather(checkin_task, habits_task, trend_task)

    completed_habits = sum(1 for _, log in habit_pairs if log)
    due_habits = [
        {"id": h.id, "title": h.title, "life_area_id": h.life_area_id}
        for h, log in habit_pairs if not log
    ]

    score_trends: dict = {}
    area_fields = [
        "score_discipline", "score_focus", "score_learning", "score_career",
        "score_health", "score_mental", "score_social", "score_financial",
    ]
    for field in area_fields:
        scores = [getattr(c, field) for c in trend if getattr(c, field) is not None]
        area_slug = field.replace("score_", "")
        today_val = getattr(checkin, field)
        week_avg = round(sum(scores) / len(scores), 2) if scores else None
        prev_scores = scores[:-1] if len(scores) > 1 else []
        prev_avg = sum(prev_scores) / len(prev_scores) if prev_scores else None
        trend_dir = "stable"
        if today_val and prev_avg:
            if today_val > prev_avg + 0.5:
                trend_dir = "up"
            elif today_val < prev_avg - 0.5:
                trend_dir = "down"
        score_trends[area_slug] = {"today": today_val, "week_avg": week_avg, "trend": trend_dir}

    return {
        "user": {
            "display_name": current_user.display_name or current_user.full_name,
            "onboarding_state": current_user.onboarding_state,
        },
        "today": {
            "checkin": {
                "id": checkin.id,
                "overall_score": checkin.overall_score,
                "is_complete": checkin.is_complete,
                "ai_analysis": checkin.ai_analysis,
            },
            "habits_summary": {
                "total": len(habit_pairs),
                "completed": completed_habits,
                "due_today": due_habits,
            },
        },
        "life_area_scores": score_trends,
    }
