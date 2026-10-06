"""Date helpers that respect the user's timezone."""
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

RANGES = (7, 30, 90, 365)


def user_today(tz_name: Optional[str], now: Optional[datetime] = None) -> date:
    """Today's date in the user's timezone (UTC if the name is missing or unknown)."""
    try:
        tz = ZoneInfo(tz_name) if tz_name else timezone.utc
    except (ZoneInfoNotFoundError, ValueError):
        tz = timezone.utc
    return (now or datetime.now(timezone.utc)).astimezone(tz).date()


def day_range(end: date, days: int) -> list[date]:
    """The `days` calendar days ending at `end` (inclusive), oldest first."""
    return [end - timedelta(days=days - 1 - i) for i in range(days)]


def review_week_start(today: date) -> date:
    """Monday of the week a weekly review run on `today` should cover.

    The week containing yesterday: run on a Sunday it covers the week ending that day; run on a
    Monday (already Monday for users east of the server) it covers the week that just ended.
    """
    yesterday = today - timedelta(days=1)
    return yesterday - timedelta(days=yesterday.weekday())
