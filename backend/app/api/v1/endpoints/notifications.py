import logging

from fastapi import APIRouter, BackgroundTasks, status
from sqlalchemy import select

from app.api.deps import DB, SchedulerAuth
from app.models.user import User
from app.services import digest
from app.services.dates import user_today
from app.services.email_service import send_weekly_digest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/weekly-digest", status_code=status.HTTP_202_ACCEPTED, dependencies=[SchedulerAuth])
async def trigger_weekly_digest(background_tasks: BackgroundTasks, db: DB):
    """Scheduler entry point: queue the digest for every verified, active user who has it switched on."""
    users = await db.scalars(
        select(User).where(
            User.is_active.is_(True),
            User.deleted_at.is_(None),
            User.email_verified_at.is_not(None),
            User.digest_enabled.is_(True),
        ).order_by(User.id)
    )

    queued = 0
    for user in users.all():
        try:
            data = await digest.build_digest(db, user, user_today(user.timezone))
        except Exception:  # one user's data must not stop everyone else's email
            logger.exception("digest: could not build for user %d", user.id)
            continue
        background_tasks.add_task(send_weekly_digest, user.email, user.full_name, data)
        queued += 1

    return {"queued": queued}
