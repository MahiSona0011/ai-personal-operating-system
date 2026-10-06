import csv
import io
from datetime import date, timedelta

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.api.deps import CurrentUser, DB
from app.models.checkin import DailyCheckin
from app.models.habit import Habit, HabitLog

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/checkins.csv")
async def export_checkins(
    current_user: CurrentUser,
    db: DB,
    days: int = Query(90, ge=1, le=365),
):
    since = date.today() - timedelta(days=days)
    rows = await db.scalars(
        select(DailyCheckin)
        .where(
            DailyCheckin.user_id == current_user.id,
            DailyCheckin.checkin_date >= since,
        )
        .order_by(DailyCheckin.checkin_date)
    )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "date", "overall_score", "mood", "energy",
        "health", "mind", "relationships", "work", "money", "growth", "complete",
    ])
    for c in rows.all():
        writer.writerow([
            c.checkin_date, c.overall_score, c.mood, c.energy,
            c.score_health, c.score_mind, c.score_relationships,
            c.score_work, c.score_money, c.score_growth,
            c.is_complete,
        ])

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=checkins_{days}d.csv"},
    )


@router.get("/habits.csv")
async def export_habits(
    current_user: CurrentUser,
    db: DB,
    days: int = Query(90, ge=1, le=365),
):
    since = date.today() - timedelta(days=days)
    logs = await db.scalars(
        select(HabitLog)
        .where(
            HabitLog.user_id == current_user.id,
            HabitLog.log_date >= since,
        )
        .order_by(HabitLog.log_date, HabitLog.habit_id)
    )

    habits = await db.scalars(
        select(Habit).where(Habit.user_id == current_user.id)
    )
    habit_titles = {h.id: h.title for h in habits.all()}

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["date", "habit_id", "habit_title", "completion_count", "status", "notes"])
    for log in logs.all():
        writer.writerow([
            log.log_date,
            log.habit_id,
            habit_titles.get(log.habit_id, ""),
            log.completion_count,
            log.status,
            log.notes or "",
        ])

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=habits_{days}d.csv"},
    )
