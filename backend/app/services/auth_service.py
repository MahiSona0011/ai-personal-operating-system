from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, hash_refresh_token, generate_token_family,
    new_emailed_token, hash_emailed_token,
)
from app.models.auth_token import AuthToken, PURPOSE_EMAIL_VERIFY, PURPOSE_PASSWORD_RESET
from app.models.base import Base
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
    session = await db.scalar(select(UserSession).where(UserSession.refresh_token == hashed))

    if not session:
        raise AuthError("Invalid refresh token", "invalid_token")

    # Reuse detection: every refresh retires the token it was given, so a retired token turning up
    # again means it was copied. Revoke the whole family; the caller must commit before answering.
    if session.is_revoked:
        await db.execute(
            update(UserSession)
            .where(UserSession.token_family == session.token_family)
            .values(is_revoked=True)
        )
        raise AuthError("Token reuse detected — all sessions revoked", "token_reuse")

    expires_at = session.expires_at
    if expires_at.tzinfo is None:  # SQLite returns naive datetimes; Postgres returns aware
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise AuthError("Refresh token expired", "token_expired")

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


# --- Emailed single-use tokens (password reset, email verification) ---------------------------

RESET_TOKEN_TTL = timedelta(hours=1)
VERIFY_TOKEN_TTL = timedelta(hours=24)
INVALID_LINK = "This link is invalid or has expired"


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)  # SQLite returns naive datetimes


async def issue_token(db: AsyncSession, user_id: int, purpose: str, ttl: timedelta) -> str:
    """Create a token and invalidate any older unused ones of the same purpose. Returns the raw token."""
    now = datetime.now(timezone.utc)
    await db.execute(
        update(AuthToken)
        .where(AuthToken.user_id == user_id, AuthToken.purpose == purpose, AuthToken.used_at.is_(None))
        .values(used_at=now)
    )
    raw, hashed = new_emailed_token()
    db.add(AuthToken(user_id=user_id, purpose=purpose, token_hash=hashed, expires_at=now + ttl))
    await db.flush()
    return raw


async def consume_token(db: AsyncSession, raw: str, purpose: str) -> int:
    """Mark a token used and return its user_id. One error for unknown, used, expired or wrong purpose."""
    token = await db.scalar(
        select(AuthToken).where(AuthToken.token_hash == hash_emailed_token(raw), AuthToken.purpose == purpose)
    )
    if not token or token.used_at is not None or _aware(token.expires_at) < datetime.now(timezone.utc):
        raise AuthError(INVALID_LINK, "invalid_token")
    token.used_at = datetime.now(timezone.utc)
    await db.flush()
    return token.user_id


async def start_password_reset(db: AsyncSession, email: str) -> Optional[tuple[User, str]]:
    """Returns (user, raw_token), or None when no active account matches (callers must not reveal which)."""
    user = await db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None), User.is_active.is_(True)))
    if not user:
        return None
    return user, await issue_token(db, user.id, PURPOSE_PASSWORD_RESET, RESET_TOKEN_TTL)


async def finish_password_reset(db: AsyncSession, raw: str, new_password: str) -> None:
    user_id = await consume_token(db, raw, PURPOSE_PASSWORD_RESET)
    await db.execute(update(User).where(User.id == user_id).values(hashed_password=hash_password(new_password)))
    await revoke_all_user_sessions(db, user_id)


async def start_email_verification(db: AsyncSession, user: User) -> str:
    return await issue_token(db, user.id, PURPOSE_EMAIL_VERIFY, VERIFY_TOKEN_TTL)


async def verify_email(db: AsyncSession, raw: str) -> None:
    user_id = await consume_token(db, raw, PURPOSE_EMAIL_VERIFY)
    await db.execute(
        update(User)
        .where(User.id == user_id, User.email_verified_at.is_(None))
        .values(email_verified_at=datetime.now(timezone.utc))
    )


async def delete_account_data(db: AsyncSession, user: User) -> None:
    """Hard-delete everything the user owns, then the user. Child tables first, in FK order."""
    for table in reversed(Base.metadata.sorted_tables):
        if table.name != "users" and "user_id" in table.c:
            await db.execute(delete(table).where(table.c.user_id == user.id))
    await db.execute(delete(User).where(User.id == user.id))
