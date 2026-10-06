import logging
from datetime import date, timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, status
from sqlalchemy import select

from app.api.deps import AIQuota, CurrentUser, DB, SchedulerAuth
from app.models.ai_recommendation import AIRecommendation, WeeklyReview
from app.models.checkin import DailyCheckin
from app.schemas.analysis import (
    OnDemandRequest, UpdateRecommendationRequest,
    RecommendationResponse, WeeklyReviewRequest, WeeklyReviewResponse,
)
from app.ai import ai_service
from app.core.limiter import AI_LIMIT, limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/checkin/{checkin_id}", status_code=status.HTTP_202_ACCEPTED, dependencies=[AIQuota])
@limiter.limit(AI_LIMIT)
async def retrigger_checkin_analysis(
    request: Request,
    checkin_id: int,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DB,
):
    checkin = await db.scalar(
        select(DailyCheckin).where(
            DailyCheckin.id == checkin_id,
            DailyCheckin.user_id == current_user.id,
        )
    )
    if not checkin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in not found")
    if not checkin.is_complete:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Check-in is not completed yet")

    from app.core.database import AsyncSessionLocal

    async def _run():
        async with AsyncSessionLocal() as bg_db:
            await ai_service.analyze_checkin(bg_db, checkin_id, current_user.id)

    background_tasks.add_task(_run)
    return {"message": "Analysis queued"}


@router.post("/on-demand", response_model=RecommendationResponse, dependencies=[AIQuota])
@limiter.limit(AI_LIMIT)
async def ask_on_demand(
    request: Request,
    data: OnDemandRequest,
    current_user: CurrentUser,
    db: DB,
):
    rec = await ai_service.on_demand_analysis(
        db, current_user.id, data.question, data.context_areas
    )
    if not rec:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI analysis failed")
    return rec


@router.get("/recommendations", response_model=list[RecommendationResponse])
async def list_recommendations(
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    rec_type: str | None = Query(None, alias="type"),
    include_dismissed: bool = Query(False),
):
    q = (
        select(AIRecommendation)
        .where(AIRecommendation.user_id == current_user.id)
        .order_by(AIRecommendation.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if rec_type:
        q = q.where(AIRecommendation.recommendation_type == rec_type)
    if not include_dismissed:
        q = q.where(AIRecommendation.is_dismissed == False)
    result = await db.scalars(q)
    return list(result.all())


@router.patch("/recommendations/{rec_id}", response_model=RecommendationResponse)
async def update_recommendation(
    rec_id: int,
    data: UpdateRecommendationRequest,
    current_user: CurrentUser,
    db: DB,
):
    rec = await db.scalar(
        select(AIRecommendation).where(
            AIRecommendation.id == rec_id,
            AIRecommendation.user_id == current_user.id,
        )
    )
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rec, field, value)
    await db.flush()
    return rec


@router.post(
    "/reviews/weekly", response_model=WeeklyReviewResponse, status_code=status.HTTP_202_ACCEPTED, dependencies=[AIQuota]
)
@limiter.limit(AI_LIMIT)
async def generate_weekly(
    request: Request,
    data: WeeklyReviewRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DB,
):
    from app.core.database import AsyncSessionLocal

    async def _run():
        async with AsyncSessionLocal() as bg_db:
            await ai_service.generate_weekly_review(bg_db, current_user.id, data.week_start)

    background_tasks.add_task(_run)

    # Return existing or skeleton
    existing = await db.scalar(
        select(WeeklyReview).where(
            WeeklyReview.user_id == current_user.id,
            WeeklyReview.week_start_date == data.week_start,
        )
    )
    if existing:
        return existing

    week_end = data.week_start + timedelta(days=6)
    skeleton = WeeklyReview(
        user_id=current_user.id,
        week_start_date=data.week_start,
        week_end_date=week_end,
        avg_scores={},
        generation_status="pending",
    )
    db.add(skeleton)
    await db.flush()
    return skeleton


@router.get("/reviews/weekly", response_model=list[WeeklyReviewResponse])
async def list_weekly_reviews(
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(12, ge=1, le=52),
):
    result = await db.scalars(
        select(WeeklyReview)
        .where(WeeklyReview.user_id == current_user.id)
        .order_by(WeeklyReview.week_start_date.desc())
        .limit(limit)
    )
    return list(result.all())


@router.post("/weekly-reviews/generate-all", status_code=status.HTTP_202_ACCEPTED, dependencies=[SchedulerAuth])
async def generate_all_weekly_reviews(
    background_tasks: BackgroundTasks,
    week_start: date | None = Query(None, description="Monday to review; defaults to each user's just-ended week"),
):
    """Scheduler entry point: a weekly review for every verified, active user who doesn't have one.

    Runs in the background, one user at a time, and honours each user's daily AI cap. Idempotent.
    """
    from app.ai import batch
    from app.core.database import AsyncSessionLocal

    background_tasks.add_task(batch.generate_all_weekly, AsyncSessionLocal, week_start=week_start)
    return {"message": "Weekly review generation started"}
