from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status

from app.api.deps import CurrentUser, DB
from app.schemas.checkin import (
    CheckinResponse, CreateCheckinRequest, UpdateCheckinRequest, CheckinTrendPoint
)
from app.services import checkin_service

router = APIRouter(prefix="/checkins", tags=["checkins"])


@router.get("/today", response_model=CheckinResponse)
async def get_today(current_user: CurrentUser, db: DB):
    checkin = await checkin_service.get_or_create_today(db, current_user.id)
    return checkin


@router.post("", response_model=CheckinResponse, status_code=status.HTTP_201_CREATED)
async def create(data: CreateCheckinRequest, current_user: CurrentUser, db: DB):
    return await checkin_service.create_checkin(db, current_user.id, data)


@router.patch("/{checkin_id}", response_model=CheckinResponse)
async def update(checkin_id: int, data: UpdateCheckinRequest, current_user: CurrentUser, db: DB):
    from sqlalchemy import select
    from app.models.checkin import DailyCheckin
    checkin = await db.scalar(
        select(DailyCheckin).where(DailyCheckin.id == checkin_id, DailyCheckin.user_id == current_user.id)
    )
    if not checkin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in not found")
    return await checkin_service.update_checkin(db, checkin, data)


@router.post("/{checkin_id}/complete", response_model=CheckinResponse)
async def complete(checkin_id: int, background_tasks: BackgroundTasks, current_user: CurrentUser, db: DB):
    from sqlalchemy import select
    from app.models.checkin import DailyCheckin
    checkin = await db.scalar(
        select(DailyCheckin).where(DailyCheckin.id == checkin_id, DailyCheckin.user_id == current_user.id)
    )
    if not checkin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in not found")

    checkin = await checkin_service.complete_checkin(db, checkin)

    from app.core.database import AsyncSessionLocal
    from app.ai import ai_service

    async def _analyze():
        async with AsyncSessionLocal() as bg_db:
            await ai_service.analyze_checkin(bg_db, checkin.id, current_user.id)

    background_tasks.add_task(_analyze)
    return checkin


@router.get("/trend", response_model=list[CheckinTrendPoint])
async def trend(current_user: CurrentUser, db: DB, days: int = Query(30, ge=7, le=365)):
    checkins = await checkin_service.get_trend(db, current_user.id, days)
    return checkins
