from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checkin import DailyCheckin
from app.models.habit import Habit, HabitLog
from app.models.goal import Goal

AREA_SCORE_FIELDS = [
    "score_discipline", "score_focus", "score_learning", "score_career",
    "score_health", "score_mental", "score_social", "score_financial",
]
AREA_SLUGS = ["discipline", "focus", "learning", "career", "health", "mental", "social", "financial"]


def _format_scores(checkin: DailyCheckin) -> str:
    parts = []
    for field, slug in zip(AREA_SCORE_FIELDS, AREA_SLUGS):
        val = getattr(checkin, field)
        if val is not None:
            parts.append(f"{slug}: {val}")
    return ", ".join(parts) if parts else "no scores"


def _format_trend(checkins: list[DailyCheckin]) -> str:
    if not checkins:
        return "No prior data"
    lines = []
    for c in checkins:
        overall = float(c.overall_score) if c.overall_score else "?"
        lines.append(f"{c.checkin_date}: overall {overall}")
    return "\n".join(lines)


async def build_daily_context(db: AsyncSession, checkin: DailyCheckin, user_id: int) -> dict:
    cutoff = checkin.checkin_date - timedelta(days=7)
    trend_rows = await db.scalars(
        select(DailyCheckin)
        .where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date >= cutoff,
            DailyCheckin.checkin_date < checkin.checkin_date,
            DailyCheckin.is_complete == True,
        )
        .order_by(DailyCheckin.checkin_date.desc())
    )
    trend = list(trend_rows.all())

    habits_rows = await db.scalars(
        select(Habit).where(Habit.user_id == user_id, Habit.is_active == True, Habit.deleted_at.is_(None))
    )
    habits = list(habits_rows.all())

    goals_rows = await db.scalars(
        select(Goal)
        .where(Goal.user_id == user_id, Goal.status == "active", Goal.deleted_at.is_(None))
        .order_by(Goal.priority.desc())
        .limit(3)
    )
    goals = list(goals_rows.all())

    habits_str = "\n".join(
        f"{h.current_streak}d | {h.title} | area_id:{h.life_area_id}"
        for h in habits
    ) or "No active habits"

    goals_str = "\n".join(
        f"{int(g.progress_pct)}% | {g.title} | area_id:{g.life_area_id}"
        for g in goals
    ) or "No active goals"

    return {
        "checkin_date": str(checkin.checkin_date),
        "scores": _format_scores(checkin),
        "overall_score": float(checkin.overall_score) if checkin.overall_score else "not computed",
        "mood": checkin.mood or "not set",
        "energy": checkin.energy or "not set",
        "wins": ", ".join(checkin.wins) if checkin.wins else "none recorded",
        "blockers": ", ".join(checkin.blockers) if checkin.blockers else "none recorded",
        "trend": _format_trend(trend),
        "habits": habits_str,
        "goals": goals_str,
    }


async def build_weekly_context(
    db: AsyncSession,
    user_id: int,
    week_start: date,
    week_end: date,
) -> dict:
    # This week's checkins
    this_week = await db.scalars(
        select(DailyCheckin)
        .where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date >= week_start,
            DailyCheckin.checkin_date <= week_end,
            DailyCheckin.is_complete == True,
        )
    )
    this_week_list = list(this_week.all())

    # Last week's checkins
    last_start = week_start - timedelta(days=7)
    last_end = week_start - timedelta(days=1)
    last_week = await db.scalars(
        select(DailyCheckin)
        .where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date >= last_start,
            DailyCheckin.checkin_date <= last_end,
            DailyCheckin.is_complete == True,
        )
    )
    last_week_list = list(last_week.all())

    def avg_scores(rows: list[DailyCheckin]) -> dict:
        totals: dict[str, list[float]] = {}
        for c in rows:
            for field, slug in zip(AREA_SCORE_FIELDS, AREA_SLUGS):
                val = getattr(c, field)
                if val is not None:
                    totals.setdefault(slug, []).append(val)
        return {k: round(sum(v) / len(v), 1) for k, v in totals.items()}

    habit_logs = await db.scalars(
        select(HabitLog).where(
            HabitLog.user_id == user_id,
            HabitLog.log_date >= week_start,
            HabitLog.log_date <= week_end,
        )
    )
    logs = list(habit_logs.all())
    habits_total = len(logs)
    habits_completed = sum(1 for l in logs if l.status == "completed")

    from app.models.session import WorkSession
    sessions = await db.scalars(
        select(WorkSession).where(
            WorkSession.user_id == user_id,
            WorkSession.started_at >= week_start.strftime("%Y-%m-%d"),
            WorkSession.deleted_at.is_(None),
        )
    )
    session_minutes = sum(s.duration_minutes or 0 for s in sessions.all())

    goals_rows = await db.scalars(
        select(Goal)
        .where(Goal.user_id == user_id, Goal.status == "active", Goal.deleted_at.is_(None))
        .order_by(Goal.priority.desc())
        .limit(3)
    )
    goals = list(goals_rows.all())

    weekly_notes = []
    for c in this_week_list:
        if c.wins:
            weekly_notes.append(f"{c.checkin_date} wins: {', '.join(c.wins)}")
        if c.blockers:
            weekly_notes.append(f"{c.checkin_date} blockers: {', '.join(c.blockers)}")

    return {
        "week_start": str(week_start),
        "avg_scores": avg_scores(this_week_list) or "no data",
        "last_week_scores": avg_scores(last_week_list) or "no data",
        "habit_rate": round(habits_completed / habits_total * 100, 1) if habits_total > 0 else 0,
        "habits_completed": habits_completed,
        "habits_total": habits_total,
        "session_minutes": session_minutes,
        "goals": "\n".join(f"{int(g.progress_pct)}% | {g.title}" for g in goals) or "none",
        "weekly_notes": "\n".join(weekly_notes) or "no notes",
    }


async def build_on_demand_context(db: AsyncSession, user_id: int, context_areas: list[str]) -> dict:
    cutoff = date.today() - timedelta(days=14)
    recent = await db.scalars(
        select(DailyCheckin)
        .where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date >= cutoff,
            DailyCheckin.is_complete == True,
        )
        .order_by(DailyCheckin.checkin_date.desc())
    )
    recent_list = list(recent.all())

    habits_rows = await db.scalars(
        select(Habit).where(Habit.user_id == user_id, Habit.is_active == True, Habit.deleted_at.is_(None))
    )
    habits = list(habits_rows.all())

    goals_rows = await db.scalars(
        select(Goal).where(Goal.user_id == user_id, Goal.status == "active", Goal.deleted_at.is_(None))
        .order_by(Goal.priority.desc()).limit(5)
    )
    goals = list(goals_rows.all())

    checkin_lines = []
    for c in recent_list:
        checkin_lines.append(f"{c.checkin_date}: overall {float(c.overall_score) if c.overall_score else '?'} | {_format_scores(c)}")

    habit_lines = []
    for h in habits:
        rate = round(h.total_completions / max(1, (date.today() - h.created_at.date()).days + 1) * 100, 0)
        habit_lines.append(f"{h.current_streak}d streak | {h.title} | {rate}%")

    return {
        "recent_checkins": "\n".join(checkin_lines) or "no data",
        "habits": "\n".join(habit_lines) or "none",
        "goals": "\n".join(f"{int(g.progress_pct)}% | {g.title}" for g in goals) or "none",
        "context_areas": ", ".join(context_areas) if context_areas else "all",
    }
