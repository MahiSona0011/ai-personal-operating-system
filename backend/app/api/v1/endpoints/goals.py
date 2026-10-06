from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DB, ensure_life_area
from app.models.goal import Goal, Milestone
from app.schemas.goal import (
    GoalResponse, CreateGoalRequest, UpdateGoalRequest,
    MilestoneResponse, CreateMilestoneRequest,
)

router = APIRouter(prefix="/goals", tags=["goals"])


async def _get_goal_or_404(db, user_id: int, goal_id: int) -> Goal:
    goal = await db.scalar(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id, Goal.deleted_at.is_(None))
    )
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    return goal


@router.get("", response_model=list[GoalResponse])
async def list_goals(current_user: CurrentUser, db: DB):
    from sqlalchemy.orm import selectinload
    result = await db.scalars(
        select(Goal)
        .options(selectinload(Goal.milestones))
        .where(Goal.user_id == current_user.id, Goal.deleted_at.is_(None))
        .order_by(Goal.priority.desc(), Goal.created_at.desc())
    )
    return list(result.all())


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create(data: CreateGoalRequest, current_user: CurrentUser, db: DB):
    await ensure_life_area(db, data.life_area_id)
    goal = Goal(user_id=current_user.id, **data.model_dump())
    db.add(goal)
    await db.flush()
    await db.refresh(goal, ["milestones"])
    return goal


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update(goal_id: int, data: UpdateGoalRequest, current_user: CurrentUser, db: DB):
    goal = await _get_goal_or_404(db, current_user.id, goal_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    await db.flush()
    await db.refresh(goal, ["milestones"])
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(goal_id: int, current_user: CurrentUser, db: DB):
    goal = await _get_goal_or_404(db, current_user.id, goal_id)
    goal.deleted_at = datetime.now(timezone.utc)
    await db.flush()


@router.post("/{goal_id}/complete", response_model=GoalResponse)
async def complete(goal_id: int, current_user: CurrentUser, db: DB):
    goal = await _get_goal_or_404(db, current_user.id, goal_id)
    goal.status = "completed"
    goal.progress_pct = 100.0
    goal.completed_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(goal, ["milestones"])
    return goal


@router.post("/{goal_id}/milestones", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
async def add_milestone(goal_id: int, data: CreateMilestoneRequest, current_user: CurrentUser, db: DB):
    goal = await _get_goal_or_404(db, current_user.id, goal_id)
    milestone = Milestone(user_id=current_user.id, goal_id=goal.id, **data.model_dump())
    db.add(milestone)
    await db.flush()
    return milestone


async def _milestone_or_404(db, user_id: int, goal_id: int, milestone_id: int) -> Milestone:
    milestone = await db.scalar(
        select(Milestone).where(
            Milestone.id == milestone_id,
            Milestone.goal_id == goal_id,
            Milestone.user_id == user_id,
        )
    )
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
    return milestone


async def _recompute_progress(db, user_id: int, goal_id: int) -> None:
    """Goal progress = share of its milestones that are done (unchanged when it has none)."""
    goal = await _get_goal_or_404(db, user_id, goal_id)
    rows = await db.scalars(select(Milestone).where(Milestone.goal_id == goal_id, Milestone.deleted_at.is_(None)))
    milestones = list(rows.all())
    if milestones:
        done = sum(1 for m in milestones if m.is_completed)
        goal.progress_pct = round(done / len(milestones) * 100, 2)
        await db.flush()


@router.post("/{goal_id}/milestones/{milestone_id}/complete", response_model=MilestoneResponse)
async def complete_milestone(goal_id: int, milestone_id: int, current_user: CurrentUser, db: DB):
    milestone = await _milestone_or_404(db, current_user.id, goal_id, milestone_id)
    milestone.is_completed = True
    milestone.completed_at = datetime.now(timezone.utc)
    await db.flush()
    await _recompute_progress(db, current_user.id, goal_id)
    return milestone


@router.post("/{goal_id}/milestones/{milestone_id}/uncomplete", response_model=MilestoneResponse)
async def uncomplete_milestone(goal_id: int, milestone_id: int, current_user: CurrentUser, db: DB):
    """Undo for completing a milestone."""
    milestone = await _milestone_or_404(db, current_user.id, goal_id, milestone_id)
    milestone.is_completed = False
    milestone.completed_at = None
    await db.flush()
    await _recompute_progress(db, current_user.id, goal_id)
    return milestone
