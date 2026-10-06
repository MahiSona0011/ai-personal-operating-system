from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DB
from app.models.session import WorkSession
from app.schemas.session import (
    CreateSessionRequest, UpdateSessionRequest, SessionResponse, SessionStatsResponse,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)  # SQLite hands back naive datetimes


async def _get_session_or_404(db, user_id: int, session_id: int) -> WorkSession:
    session = await db.scalar(
        select(WorkSession).where(
            WorkSession.id == session_id,
            WorkSession.user_id == user_id,
            WorkSession.deleted_at.is_(None),
        )
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    life_area_id: Optional[int] = Query(None),
):
    q = (
        select(WorkSession)
        .where(WorkSession.user_id == current_user.id, WorkSession.deleted_at.is_(None))
        .order_by(WorkSession.started_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if life_area_id is not None:
        q = q.where(WorkSession.life_area_id == life_area_id)
    result = await db.scalars(q)
    return list(result.all())


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create(data: CreateSessionRequest, current_user: CurrentUser, db: DB):
    payload = data.model_dump()
    # Compute duration from timestamps if not supplied
    if payload.get("duration_minutes") is None and payload.get("ended_at"):
        delta = payload["ended_at"] - payload["started_at"]
        payload["duration_minutes"] = max(1, int(delta.total_seconds() / 60))
    session = WorkSession(user_id=current_user.id, **payload)
    db.add(session)
    await db.flush()
    return session


@router.patch("/{session_id}", response_model=SessionResponse)
async def update(session_id: int, data: UpdateSessionRequest, current_user: CurrentUser, db: DB):
    session = await _get_session_or_404(db, current_user.id, session_id)
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(session, field, value)
    if session.ended_at and session.duration_minutes is None:
        delta = _aware(session.ended_at) - _aware(session.started_at)
        session.duration_minutes = max(1, int(delta.total_seconds() / 60))
    await db.flush()
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(session_id: int, current_user: CurrentUser, db: DB):
    session = await _get_session_or_404(db, current_user.id, session_id)
    session.deleted_at = datetime.now(timezone.utc)
    await db.flush()


@router.get("/stats", response_model=SessionStatsResponse)
async def stats(
    current_user: CurrentUser,
    db: DB,
    days: int = Query(84, ge=7, le=365),
    session_type: Optional[str] = Query(None, description="Only this type, e.g. deep_work"),
    life_area_id: Optional[int] = Query(None, description="Only this life area"),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    q = select(WorkSession).where(
        WorkSession.user_id == current_user.id,
        WorkSession.deleted_at.is_(None),
        WorkSession.started_at >= since,
    )
    if session_type:
        q = q.where(WorkSession.session_type == session_type)
    if life_area_id is not None:
        q = q.where(WorkSession.life_area_id == life_area_id)
    rows = await db.execute(q)
    sessions = list(rows.scalars().all())

    total_minutes = sum(s.duration_minutes or 0 for s in sessions)
    session_count = len(sessions)
    rated = [s.quality_rating for s in sessions if s.quality_rating is not None]
    avg_quality = round(sum(rated) / len(rated), 2) if rated else None

    by_area: dict[str, int] = {}
    for s in sessions:
        key = str(s.life_area_id)
        by_area[key] = by_area.get(key, 0) + (s.duration_minutes or 0)

    # Group by ISO week start (Monday)
    week_buckets: dict[str, dict] = {}
    for s in sessions:
        started = s.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        week_start = (started - timedelta(days=started.weekday())).date().isoformat()
        if week_start not in week_buckets:
            week_buckets[week_start] = {"week_start": week_start, "minutes": 0, "count": 0}
        week_buckets[week_start]["minutes"] += s.duration_minutes or 0
        week_buckets[week_start]["count"] += 1

    by_week = sorted(week_buckets.values(), key=lambda x: x["week_start"])

    return SessionStatsResponse(
        total_minutes=total_minutes,
        session_count=session_count,
        avg_quality=avg_quality,
        by_area=by_area,
        by_week=by_week,
    )
