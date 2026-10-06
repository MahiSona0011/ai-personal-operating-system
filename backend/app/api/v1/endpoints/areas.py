from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DB, RangeDays, UserToday
from app.core.areas import AREAS
from app.models.goal import Goal
from app.services import habit_stats, insight_service, metric_stats, scoring, trends
from app.services.dates import day_range

router = APIRouter(prefix="/areas", tags=["areas"])

AREA_BY_ID = {a[0]: a for a in AREAS}


@router.get("/{area_id}/summary")
async def area_summary(area_id: int, current_user: CurrentUser, db: DB, today: UserToday, days: RangeDays):
    """One call per area page: the area's score series and change, its habits with 30-day rates,
    active goals, the latest 3 recommendations tagged to it, and the latest value of each metric."""
    if area_id not in AREA_BY_ID:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Life area not found")
    _, slug, name, icon, color = AREA_BY_ID[area_id]
    uid = current_user.id

    current_days = day_range(today, days)
    previous_start = current_days[0] - timedelta(days=days)
    rows = await trends.load_checkins(db, uid, previous_start, today)
    series = [
        {"date": d, "score": getattr(rows[d], f"score_{slug}") if d in rows else None}
        for d in current_days
    ]
    previous = [getattr(rows[d], f"score_{slug}") for d in day_range(current_days[0] - timedelta(days=1), days) if d in rows]
    score = scoring.mean(p["score"] for p in series)

    habits = [h for h in await habit_stats.active_habits(db, uid) if h.life_area_id == area_id]
    done = await habit_stats.completed_by_habit(
        db, [h.id for h in habits], today - timedelta(days=habit_stats.PER_HABIT_WINDOW - 1), today
    )

    goals = (await db.scalars(
        select(Goal)
        .where(Goal.user_id == uid, Goal.life_area_id == area_id, Goal.status == "active", Goal.deleted_at.is_(None))
        .order_by(Goal.priority.desc(), Goal.created_at.desc())
    )).all()

    return {
        "area": {"id": area_id, "slug": slug, "name": name, "icon": icon, "color": color},
        "days": days,
        "score": score,
        "delta": scoring.delta(score, scoring.mean(previous)),
        "series": series,
        "habits": habit_stats.habit_rates(habits, done, today),
        "goals": [
            {
                "id": g.id,
                "title": g.title,
                "progress_pct": float(g.progress_pct),
                "target_date": g.target_date,
                "priority": g.priority,
            }
            for g in goals
        ],
        "recommendations": await insight_service.recommendations_for_area(db, uid, area_id),
        "metrics": await metric_stats.latest_by_key(db, uid, area_id),
    }
