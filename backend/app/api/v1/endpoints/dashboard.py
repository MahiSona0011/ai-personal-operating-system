from fastapi import APIRouter

from app.api.deps import CurrentUser, DB, RangeDays, UserToday
from app.core.areas import AREA_SLUGS
from app.services import checkin_service, habit_service, highlights, insight_service, scoring, signals, trends
from app.services.checkin_service import AREA_SCORE_FIELDS
from app.services.dates import day_range

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(current_user: CurrentUser, db: DB, today: UserToday, days: RangeDays):
    """Everything the dashboard needs in one call.

    `days` is the comparison period: the Life Score and area scores are averages over the last
    `days` days, and each delta is against the `days` before that.
    """
    # Sequential on purpose: one AsyncSession is one connection, and asyncpg rejects concurrent
    # operations on it ("another operation is in progress"). Don't asyncio.gather these.
    selected = scoring.selected_area_slugs(current_user.preferences)
    checkin = await checkin_service.get_or_create_today(db, current_user.id, today)
    habit_pairs = await habit_service.get_habits_with_today_status(db, current_user.id, today)
    trend = await checkin_service.get_trend(db, current_user.id, days=7, today=today)

    completed_habits = sum(1 for _, log in habit_pairs if log)
    due_habits = [
        {"id": h.id, "title": h.title, "life_area_id": h.life_area_id}
        for h, log in habit_pairs if not log
    ]

    score_trends: dict = {}
    for field in AREA_SCORE_FIELDS:
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

    # Period comparison and the 30-day sparklines. The sparkline window is always 30 days.
    comparison = await trends.period_comparison(db, current_user.id, selected, days, today)
    spark_days = day_range(today, 30)
    spark_rows = await trends.load_checkins(db, current_user.id, spark_days[0], today)
    spark = trends.daily_points(spark_rows, spark_days, selected)

    cur, prev = comparison["current"], comparison["previous"]
    areas = {
        slug: {
            "score": cur["areas"][slug],
            "delta": scoring.delta(cur["areas"][slug], prev["areas"][slug]),
            "sparkline_30": [p["areas"][slug] for p in spark],
        }
        for slug in AREA_SLUGS
    }

    done = await trends.completed_dates(db, current_user.id)
    streak = trends.checkin_streak(done, today)
    consistency = await signals.consistency(db, current_user.id, days=days, today=today)

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
        "days": days,
        "selected_areas": selected,
        "life_score": cur["life_score"],
        "life_score_delta": scoring.delta(cur["life_score"], prev["life_score"]),
        "checkin_streak": streak,
        "checkin_consistency_30": [d in done for d in day_range(today, 30)],
        "areas": areas,
        "highlights": highlights.build_highlights(areas, consistency["rate"], streak, days),
        "latest_insight": await insight_service.latest_insight(db, current_user.id),
    }
