import time

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# In-memory storage: limits are per process. Move to a shared backend (e.g. Redis) if the API scales out.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    enabled=settings.RATE_LIMIT_ENABLED,
)

class HourlyLimiter:
    """A small sliding-window limiter for limits keyed by something slowapi can't see (e.g. IP + email
    from the request body). In-memory and per process, like the rest of the limiter; it follows
    `limiter.enabled`, so tests switch it on and off together with the others."""

    def __init__(self, per_hour_setting: str, window_seconds: int = 3600):
        self._setting = per_hour_setting
        self._window = window_seconds
        self._hits: dict[str, list[float]] = {}

    def allow(self, key: str, now: float | None = None) -> bool:
        if not limiter.enabled:
            return True
        now = time.monotonic() if now is None else now
        limit = getattr(settings, self._setting)
        recent = [t for t in self._hits.get(key, []) if now - t < self._window]
        if len(recent) >= limit:
            self._hits[key] = recent
            return False
        recent.append(now)
        self._hits[key] = recent
        return True

    def reset(self) -> None:
        self._hits.clear()


forgot_password_limiter = HourlyLimiter("RATE_LIMIT_FORGOT_PASSWORD_PER_HOUR")
verify_email_limiter = HourlyLimiter("RATE_LIMIT_VERIFY_EMAIL_PER_HOUR")

AUTH_LIMIT = f"{settings.RATE_LIMIT_AUTH_PER_MINUTE}/minute"
AI_LIMIT = f"{settings.RATE_LIMIT_AI_PER_MINUTE}/minute"
