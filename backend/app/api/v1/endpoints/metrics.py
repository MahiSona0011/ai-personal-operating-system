from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DB
from app.models.metric import Metric
from app.schemas.metric import CreateMetricRequest, UpdateMetricRequest, MetricResponse

router = APIRouter(prefix="/metrics", tags=["metrics"])


async def _get_or_404(db, user_id: int, metric_id: int) -> Metric:
    metric = await db.scalar(
        select(Metric).where(Metric.id == metric_id, Metric.user_id == user_id)
    )
    if not metric:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metric not found")
    return metric


@router.get("", response_model=list[MetricResponse])
async def list_metrics(
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    life_area_id: Optional[int] = Query(None),
    metric_key: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
):
    q = (
        select(Metric)
        .where(Metric.user_id == current_user.id)
        .order_by(Metric.metric_date.desc(), Metric.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if life_area_id is not None:
        q = q.where(Metric.life_area_id == life_area_id)
    if metric_key:
        q = q.where(Metric.metric_key == metric_key)
    if date_from:
        q = q.where(Metric.metric_date >= date_from)
    if date_to:
        q = q.where(Metric.metric_date <= date_to)
    result = await db.scalars(q)
    return list(result.all())


@router.post("", response_model=MetricResponse, status_code=status.HTTP_201_CREATED)
async def create(data: CreateMetricRequest, current_user: CurrentUser, db: DB):
    metric = Metric(user_id=current_user.id, **data.model_dump())
    db.add(metric)
    await db.flush()
    return metric


@router.get("/{metric_id}", response_model=MetricResponse)
async def get_metric(metric_id: int, current_user: CurrentUser, db: DB):
    return await _get_or_404(db, current_user.id, metric_id)


@router.patch("/{metric_id}", response_model=MetricResponse)
async def update(metric_id: int, data: UpdateMetricRequest, current_user: CurrentUser, db: DB):
    metric = await _get_or_404(db, current_user.id, metric_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(metric, field, value)
    await db.flush()
    return metric


@router.delete("/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(metric_id: int, current_user: CurrentUser, db: DB):
    metric = await _get_or_404(db, current_user.id, metric_id)
    await db.delete(metric)
    await db.flush()
