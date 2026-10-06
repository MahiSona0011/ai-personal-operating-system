"""Rule-based "what stood out" lines for the dashboard. No AI, no randomness: same data, same lines."""
from typing import Mapping, Optional

from app.core.areas import AREAS

AREA_NAME = {a[1]: a[2] for a in AREAS}

MOVE_THRESHOLD = 1.0      # an area must move at least this many points to be called out
HABIT_STRONG = 80.0       # habit completion % worth celebrating
HABIT_WEAK = 50.0         # habit completion % worth flagging
STREAK_MIN = 3            # check-in streak days worth mentioning
MAX_HIGHLIGHTS = 3


def _fmt(n: float) -> str:
    return f"{abs(n):.1f}".rstrip("0").rstrip(".")


def build_highlights(
    areas: Mapping[str, Mapping[str, Optional[float]]],
    habit_rate: Optional[float],
    streak: int,
    days: int,
) -> list[str]:
    """Up to three highlights, in priority order: biggest riser, biggest faller, habits, streak.

    `areas` maps area slug to {"score": float|None, "delta": float|None}; delta is the change
    against the previous period of the same length. `habit_rate` is a 0-100 percentage or None.
    """
    moves = [(slug, a["delta"]) for slug, a in areas.items() if a.get("delta") is not None]
    out: list[str] = []

    risers = [m for m in moves if m[1] >= MOVE_THRESHOLD]
    if risers:
        slug, d = max(risers, key=lambda m: m[1])
        out.append(f"{AREA_NAME[slug]} is up {_fmt(d)} points on the previous {days} days.")

    fallers = [m for m in moves if m[1] <= -MOVE_THRESHOLD]
    if fallers:
        slug, d = min(fallers, key=lambda m: m[1])
        out.append(f"{AREA_NAME[slug]} is down {_fmt(d)} points on the previous {days} days.")

    if habit_rate is not None:
        if habit_rate >= HABIT_STRONG:
            out.append(f"You completed {habit_rate:.0f}% of your habits in the last {days} days.")
        elif habit_rate < HABIT_WEAK:
            out.append(f"Habit completion is {habit_rate:.0f}% over the last {days} days.")

    if streak >= STREAK_MIN:
        out.append(f"{streak}-day check-in streak.")

    return out[:MAX_HIGHLIGHTS]
