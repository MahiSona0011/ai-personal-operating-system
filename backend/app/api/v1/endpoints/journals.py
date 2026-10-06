from datetime import datetime, timezone, date
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DB
from app.models.journal import JournalEntry
from app.schemas.journal import CreateJournalRequest, UpdateJournalRequest, JournalEntryResponse

router = APIRouter(prefix="/journals", tags=["journals"])


def _queue_analysis(background_tasks: BackgroundTasks, entry_id: int, user_id: int) -> None:
    """Summarise the entry in the background; the outcome lands in the entry's ai_status."""
    from app.ai import ai_service
    from app.core.database import AsyncSessionLocal

    async def _run():
        async with AsyncSessionLocal() as bg_db:
            await ai_service.analyze_journal(bg_db, entry_id, user_id)

    background_tasks.add_task(_run)


async def _get_or_404(db, user_id: int, entry_id: int) -> JournalEntry:
    entry = await db.scalar(
        select(JournalEntry).where(
            JournalEntry.id == entry_id,
            JournalEntry.user_id == user_id,
            JournalEntry.deleted_at.is_(None),
        )
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    return entry


@router.get("", response_model=list[JournalEntryResponse])
async def list_entries(
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    entry_date_from: Optional[date] = Query(None),
    entry_date_to: Optional[date] = Query(None),
    mood_tag: Optional[str] = Query(None),
    life_area_tag: Optional[str] = Query(None),
):
    q = (
        select(JournalEntry)
        .where(JournalEntry.user_id == current_user.id, JournalEntry.deleted_at.is_(None))
        .order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if entry_date_from:
        q = q.where(JournalEntry.entry_date >= entry_date_from)
    if entry_date_to:
        q = q.where(JournalEntry.entry_date <= entry_date_to)
    if mood_tag:
        q = q.where(JournalEntry.mood_tag == mood_tag)
    if life_area_tag:
        q = q.where(JournalEntry.life_area_tags.contains([life_area_tag]))
    result = await db.scalars(q)
    return list(result.all())


@router.post("", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create(data: CreateJournalRequest, background_tasks: BackgroundTasks, current_user: CurrentUser, db: DB):
    entry = JournalEntry(user_id=current_user.id, ai_status="pending", **data.model_dump())
    db.add(entry)
    await db.flush()
    _queue_analysis(background_tasks, entry.id, current_user.id)
    return entry


@router.get("/{entry_id}", response_model=JournalEntryResponse)
async def get_entry(entry_id: int, current_user: CurrentUser, db: DB):
    return await _get_or_404(db, current_user.id, entry_id)


@router.patch("/{entry_id}", response_model=JournalEntryResponse)
async def update(
    entry_id: int, data: UpdateJournalRequest, background_tasks: BackgroundTasks, current_user: CurrentUser, db: DB
):
    entry = await _get_or_404(db, current_user.id, entry_id)
    changes = data.model_dump(exclude_unset=True)
    text_changed = "content" in changes and changes["content"] != entry.content
    for field, value in changes.items():
        setattr(entry, field, value)
    if text_changed:  # tags and titles don't change what the entry says
        entry.ai_status = "pending"
    await db.flush()
    await db.refresh(entry)  # updated_at is set by the database; reading it unloaded would 500
    if text_changed:
        _queue_analysis(background_tasks, entry.id, current_user.id)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(entry_id: int, current_user: CurrentUser, db: DB):
    entry = await _get_or_404(db, current_user.id, entry_id)
    entry.deleted_at = datetime.now(timezone.utc)
    await db.flush()
