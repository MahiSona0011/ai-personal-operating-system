from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, hash_refresh_token, generate_token_family,
)
from app.models.user import User, UserSession
from app.schemas.auth import RegisterRequest


class AuthError(Exception):
    def __init__(self, message: str, code: str = "auth_error"):
        self.message = message
        self.code = code
        super().__init__(message)


async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
    existing = await db.scalar(select(User).where(User.email == data.email))
    if existing:
        raise AuthError("Email already registered", "email_taken")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        timezone=data.timezone,
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    user = await db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))
    if not user or not user.hashed_password:
        raise AuthError("Invalid credentials", "invalid_credentials")
    if not verify_password(password, user.hashed_password):
        raise AuthError("Invalid credentials", "invalid_credentials")
    if not user.is_active:
        raise AuthError("Account is disabled", "account_disabled")

    await db.execute(update(User).where(User.id == user.id).values(last_login_at=datetime.now(timezone.utc)))
    return user


async def create_session(
    db: AsyncSession, user_id: int, user_agent: Optional[str] = None, ip_address: Optional[str] = None
) -> tuple[str, str]:
    """Returns (access_token, raw_refresh_token)."""
    raw_refresh, hashed_refresh = create_refresh_token()
    family = generate_token_family()

    session = UserSession(
        user_id=user_id,
        refresh_token=hashed_refresh,
        token_family=family,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.flush()

    access_token = create_access_token(user_id)
    return access_token, raw_refresh


async def rotate_refresh_token(
    db: AsyncSession, raw_refresh_token: str, user_agent: Optional[str] = None, ip_address: Optional[str] = None
) -> tuple[str, str]:
    hashed = hash_refresh_token(raw_refresh_token)
    session = await db.scalar(
        select(UserSession).where(
            UserSession.refresh_token == hashed,
            UserSession.is_revoked.is_(False),
        )
    )

    if not session:
        raise AuthError("Invalid refresh token", "invalid_token")

    if session.expires_at < datetime.now(timezone.utc):
        raise AuthError("Refresh token expired", "token_expired")

    # Token reuse detection: revoke entire family
    reused = await db.scalar(
        select(UserSession).where(
            UserSession.token_family == session.token_family,
            UserSession.is_revoked.is_(True),
        )
    )
    if reused:
        await db.execute(
            update(UserSession)
            .where(UserSession.token_family == session.token_family)
            .values(is_revoked=True)
        )
        raise AuthError("Token reuse detected — all sessions revoked", "token_reuse")

    # Revoke old session
    session.is_revoked = True
    await db.flush()

    # Issue new session in same family
    raw_new, hashed_new = create_refresh_token()
    new_session = UserSession(
        user_id=session.user_id,
        refresh_token=hashed_new,
        token_family=session.token_family,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_session)
    await db.flush()

    access_token = create_access_token(session.user_id)
    return access_token, raw_new


async def revoke_session(db: AsyncSession, raw_refresh_token: str) -> None:
    hashed = hash_refresh_token(raw_refresh_token)
    await db.execute(
        update(UserSession)
        .where(UserSession.refresh_token == hashed)
        .values(is_revoked=True)
    )


async def revoke_all_user_sessions(db: AsyncSession, user_id: int) -> None:
    await db.execute(
        update(UserSession).where(UserSession.user_id == user_id).values(is_revoked=True)
    )
