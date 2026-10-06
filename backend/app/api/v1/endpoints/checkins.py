from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DB, RangeDays, UserToday
from app.models.checkin import DailyCheckin
from app.schemas.checkin import (
    CheckinResponse, CheckinTrendResponse, CreateCheckinRequest, UpdateCheckinRequest
)
from app.services import checkin_service, scoring, trends

router = APIRouter(prefix="/checkins", tags=["checkins"])


async def _own_checkin_or_404(db, user_id: int, checkin_id: int) -> DailyCheckin:
    checkin = await db.scalar(
        select(DailyCheckin).where(DailyCheckin.id == checkin_id, DailyCheckin.user_id == user_id)
    )
    if not checkin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in not found")
    return checkin


@router.get("/today", response_model=CheckinResponse)
async def get_today(current_user: CurrentUser, db: DB, today: UserToday):
    return await checkin_service.get_or_create_today(db, current_user.id, today)


@router.post("", response_model=CheckinResponse, status_code=status.HTTP_201_CREATED)
async def create(data: CreateCheckinRequest, current_user: CurrentUser, db: DB):
    selected = scoring.selected_area_slugs(current_user.preferences)
    return await checkin_service.create_checkin(db, current_user.id, data, selected)


@router.patch("/{checkin_id}", response_model=CheckinResponse)
async def update(checkin_id: int, data: UpdateCheckinRequest, current_user: CurrentUser, db: DB):
    checkin = await _own_checkin_or_404(db, current_user.id, checkin_id)
    selected = scoring.selected_area_slugs(current_user.preferences)
    return await checkin_service.update_checkin(db, checkin, data, selected)


@router.post("/{checkin_id}/complete", response_model=CheckinResponse)
async def complete(checkin_id: int, background_tasks: BackgroundTasks, current_user: CurrentUser, db: DB):
    checkin = await _own_checkin_or_404(db, current_user.id, checkin_id)
    selected = scoring.selected_area_slugs(current_user.preferences)
    checkin = await checkin_service.complete_checkin(db, checkin, selected)

    from app.core.database import AsyncSessionLocal
    from app.ai import ai_service

    async def _analyze():
        async with AsyncSessionLocal() as bg_db:
            await ai_service.analyze_checkin(bg_db, checkin.id, current_user.id)

    background_tasks.add_task(_analyze)
    return checkin


@router.get("/trend", response_model=CheckinTrendResponse)
async def trend(current_user: CurrentUser, db: DB, today: UserToday, days: RangeDays):
    """Life Score, mood, energy and per-area scores for each of the last `days` days.

    One point per calendar day in the user's timezone; days without a check-in are null.
    `moving_avg_7` is the trailing 7-day mean of the Life Score, aligned with `points`.
    """
    selected = scoring.selected_area_slugs(current_user.preferences)
    return await trends.checkin_trend(db, current_user.id, selected, days, today)
