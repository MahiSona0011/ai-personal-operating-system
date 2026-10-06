from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import PK_TYPE, Base, TimestampMixin

PURPOSE_PASSWORD_RESET = "password_reset"
PURPOSE_EMAIL_VERIFY = "email_verify"


class AuthToken(Base, TimestampMixin):
    """A single-use token emailed to a user (password reset, email verification).

    Only the SHA-256 of the token is stored, so a database leak does not expose usable links.
    """

    __tablename__ = "auth_tokens"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
