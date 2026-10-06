import hmac
from datetime import date
from typing import Annotated, Optional
from fastapi import Depends, Header, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import jwt

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.life_area import LifeArea
from app.models.user import User
from app.services import ai_quota
from app.services.dates import RANGES, user_today

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = int(payload["sub"])
    user = await db.scalar(
        select(User).where(User.id == user_id, User.is_active.is_(True), User.deleted_at.is_(None))
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]


async def enforce_ai_quota(current_user: CurrentUser, db: DB) -> None:
    """429 once the user has used their daily AI budget. Counts every AI call type, on a UTC day."""
    if not await ai_quota.has_quota(db, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily AI limit reached ({settings.AI_MAX_DAILY_CALLS_PER_USER}/day).",
        )


AIQuota = Depends(enforce_ai_quota)


async def require_scheduler_secret(x_digest_secret: Annotated[Optional[str], Header()] = None) -> None:
    """401 unless the scheduler's x-digest-secret matches DIGEST_SECRET. An unset secret disables the endpoints."""
    expected = settings.DIGEST_SECRET
    if not expected or not x_digest_secret or not hmac.compare_digest(x_digest_secret, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing secret")


SchedulerAuth = Depends(require_scheduler_secret)


def range_days(days: int = Query(30, description="Range in days: 7, 30, 90 or 365")) -> int:
    if days not in RANGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"days must be one of {', '.join(map(str, RANGES))}",
        )
    return days


RangeDays = Annotated[int, Depends(range_days)]


async def today_for(current_user: CurrentUser) -> date:
    """Today's date in the signed-in user's timezone."""
    return user_today(current_user.timezone)


UserToday = Annotated[date, Depends(today_for)]


async def ensure_life_area(db: AsyncSession, life_area_id: int) -> None:
    """404 if the life area doesn't exist (SQLite doesn't enforce FKs; Postgres would 500)."""
    if await db.scalar(select(LifeArea.id).where(LifeArea.id == life_area_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Life area not found")
