"""Pure-function tests: Life Score definition, highlights rules, date and moving-average helpers."""
from datetime import date, datetime, timezone

from app.services import scoring
from app.services.dates import day_range, user_today
from app.services.highlights import build_highlights
from app.services.trends import checkin_streak, moving_average

ALL = ["health", "mind", "relationships", "work", "money", "growth"]


def areas(**deltas):
    """An areas dict with a delta for the named areas and None for the rest."""
    return {s: {"score": 6.0, "delta": deltas.get(s)} for s in ALL}


# ---- scoring

def test_selected_areas_default_to_all_six():
    assert scoring.selected_area_slugs(None) == ALL
    assert scoring.selected_area_slugs({}) == ALL
    assert scoring.selected_area_slugs({"priority_area_ids": []}) == ALL
    assert scoring.selected_area_slugs({"priority_area_ids": [0, 7, "x", None]}) == ALL


def test_selected_areas_follow_onboarding_ids_in_canonical_order():
    assert scoring.selected_area_slugs({"priority_area_ids": [4, 1, 4]}) == ["health", "work"]


def test_life_score_is_the_mean_of_selected_rated_areas():
    scores = {"health": 8, "mind": None, "work": 6, "money": 2}
    assert scoring.life_score(scores, ["health", "mind", "work"]) == 7.0
    assert scoring.life_score(scores) == round((8 + 6 + 2) / 3, 2)


def test_life_score_falls_back_when_no_selected_area_was_rated():
    assert scoring.life_score({"money": 4, "work": 6}, ["health"]) == 5.0


def test_life_score_is_none_without_any_rating():
    assert scoring.life_score({}) is None
    assert scoring.life_score({"health": None}, ["health"]) is None


def test_delta_needs_both_periods():
    assert scoring.delta(7.0, 5.5) == 1.5
    assert scoring.delta(None, 5.0) is None
    assert scoring.delta(5.0, None) is None


# ---- highlights

def test_highlights_empty_without_signals():
    assert build_highlights(areas(), None, 0, 30) == []


def test_highlights_biggest_riser_and_faller():
    out = build_highlights(areas(work=1.5, money=2.4, health=-1.2, mind=-3.0), None, 0, 30)
    assert out == [
        "Money is up 2.4 points on the previous 30 days.",
        "Mind is down 3 points on the previous 30 days.",
    ]


def test_highlights_ignore_small_moves():
    assert build_highlights(areas(work=0.9, health=-0.9), None, 0, 7) == []


def test_highlights_habit_rate_strong_weak_and_middle():
    assert build_highlights(areas(), 92.0, 0, 7) == ["You completed 92% of your habits in the last 7 days."]
    assert build_highlights(areas(), 40.0, 0, 7) == ["Habit completion is 40% over the last 7 days."]
    assert build_highlights(areas(), 65.0, 0, 7) == []


def test_highlights_streak_threshold():
    assert build_highlights(areas(), None, 2, 7) == []
    assert build_highlights(areas(), None, 5, 7) == ["5-day check-in streak."]


def test_highlights_cap_at_three_in_priority_order():
    out = build_highlights(areas(work=2.0, health=-2.0), 90.0, 10, 30)
    assert len(out) == 3
    assert out[0].startswith("Work is up") and out[1].startswith("Health is down") and out[2].startswith("You completed")


def test_highlights_are_deterministic():
    args = (areas(work=2.0, money=2.0), 90.0, 4, 30)
    assert build_highlights(*args) == build_highlights(*args)


# ---- dates and trends helpers

def test_user_today_follows_timezone():
    now = datetime(2026, 3, 1, 23, 30, tzinfo=timezone.utc)
    assert user_today("UTC", now) == date(2026, 3, 1)
    assert user_today(None, now) == date(2026, 3, 1)
    assert user_today("Not/AZone", now) == date(2026, 3, 1)
    try:
        assert user_today("Pacific/Kiritimati", now) == date(2026, 3, 2)
        assert user_today("Pacific/Pago_Pago", now) == date(2026, 3, 1)
    except AssertionError:
        raise
    except Exception:
        pass  # tzdata unavailable on this machine


def test_day_range_is_inclusive_and_ascending():
    r = day_range(date(2026, 3, 1), 3)
    assert r == [date(2026, 2, 27), date(2026, 2, 28), date(2026, 3, 1)]


def test_moving_average_skips_gaps():
    assert moving_average([4, None, None, 6], 3) == [4.0, 4.0, 4.0, 6.0]
    assert moving_average([None, None], 7) == [None, None]
    assert moving_average([2, 4, 6], 2) == [2.0, 3.0, 5.0]


def test_checkin_streak():
    today = date(2026, 3, 10)
    def days(*n):
        return {date(2026, 3, d) for d in n}

    assert checkin_streak(set(), today) == 0
    assert checkin_streak(days(10, 9, 8), today) == 3
    assert checkin_streak(days(9, 8), today) == 2          # today not done yet
    assert checkin_streak(days(8, 7), today) == 0          # yesterday missed too
    assert checkin_streak(days(10, 9, 7), today) == 2      # a gap ends the streak
