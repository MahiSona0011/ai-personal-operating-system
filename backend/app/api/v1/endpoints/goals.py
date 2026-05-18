from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DB
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


@router.post("/{goal_id}/milestones/{milestone_id}/complete", response_model=MilestoneResponse)
async def complete_milestone(goal_id: int, milestone_id: int, current_user: CurrentUser, db: DB):
    milestone = await db.scalar(
        select(Milestone).where(
            Milestone.id == milestone_id,
            Milestone.goal_id == goal_id,
            Milestone.user_id == current_user.id,
        )
    )
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")

    milestone.is_completed = True
    milestone.completed_at = datetime.now(timezone.utc)
    await db.flush()

    # Recompute goal progress
    goal = await _get_goal_or_404(db, current_user.id, goal_id)
    all_milestones = await db.scalars(select(Milestone).where(Milestone.goal_id == goal_id, Milestone.deleted_at.is_(None)))
    ms_list = list(all_milestones.all())
    if ms_list:
        completed_count = sum(1 for m in ms_list if m.is_completed)
        goal.progress_pct = round(completed_count / len(ms_list) * 100, 2)
        await db.flush()

    return milestone
