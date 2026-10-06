"""Phase 3 chart endpoints: empty user, gaps, range boundaries, and isolation between users."""
from datetime import datetime, timedelta, timezone

import pytest

from app.models.ai_recommendation import AIRecommendation
from app.models.checkin import DailyCheckin
from app.models.goal import Goal
from app.models.habit import Habit, HabitLog
from app.models.metric import Metric
from app.services.dates import user_today

TODAY = user_today("UTC")
API = "/api/v1"


def ago(n: int):
    return TODAY - timedelta(days=n)


def stamp(n: int) -> datetime:
    return datetime.combine(ago(n), datetime.min.time(), tzinfo=timezone.utc)


async def user_id(client, headers) -> int:
    return (await client.get(f"{API}/auth/me", headers=headers)).json()["id"]


async def other_user(client):
    resp = await client.post(
        f"{API}/auth/register", json={"email": "other@example.com", "password": "Test1234!", "full_name": "Other"}
    )
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    return headers, await user_id(client, headers)


async def add_checkin(db, uid, n_days_ago, complete=False, **scores):
    db.add(DailyCheckin(
        user_id=uid, checkin_date=ago(n_days_ago), is_complete=complete,
        **{(k if k.startswith(("score_", "mood", "energy")) else f"score_{k}"): v for k, v in scores.items()},
    ))
    await db.flush()


async def add_habit(db, uid, created_days_ago=40, area=1, title="Read", **kw):
    h = Habit(user_id=uid, life_area_id=area, title=title, created_at=stamp(created_days_ago), **kw)
    db.add(h)
    await db.flush()
    return h


async def log(db, habit, n_days_ago, status="completed"):
    db.add(HabitLog(user_id=habit.user_id, habit_id=habit.id, log_date=ago(n_days_ago), status=status))
    await db.flush()


# ---------------------------------------------------------------- /checkins/trend

@pytest.mark.asyncio
async def test_trend_empty_user_has_one_null_point_per_day(client, auth_headers):
    body = (await client.get(f"{API}/checkins/trend?days=30", headers=auth_headers)).json()
    assert len(body["points"]) == 30
    assert body["points"][-1]["date"] == TODAY.isoformat()
    assert body["points"][0]["date"] == ago(29).isoformat()
    assert all(p["life_score"] is None and p["mood"] is None and p["energy"] is None for p in body["points"])
    assert all(set(p["areas"]) == {"health", "mind", "relationships", "work", "money", "growth"} for p in body["points"])
    assert len(body["moving_avg_7"]) == 30
    assert all(p["value"] is None for p in body["moving_avg_7"])


@pytest.mark.asyncio
async def test_trend_defaults_to_30_days(client, auth_headers):
    body = (await client.get(f"{API}/checkins/trend", headers=auth_headers)).json()
    assert len(body["points"]) == 30


@pytest.mark.asyncio
@pytest.mark.parametrize("days", [7, 30, 90, 365])
async def test_trend_accepts_the_four_ranges(client, auth_headers, days):
    body = (await client.get(f"{API}/checkins/trend?days={days}", headers=auth_headers)).json()
    assert len(body["points"]) == days


@pytest.mark.asyncio
@pytest.mark.parametrize("days", [0, 10, 31, 400, -7])
async def test_trend_rejects_other_ranges(client, auth_headers, days):
    resp = await client.get(f"{API}/checkins/trend?days={days}", headers=auth_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_trend_shows_gaps_as_null_and_averages_across_them(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    await add_checkin(db_session, uid, 0, health=8, work=6, mood=4, energy=3)
    await add_checkin(db_session, uid, 2, health=4, work=4)
    body = (await client.get(f"{API}/checkins/trend?days=7", headers=auth_headers)).json()
    by_date = {p["date"]: p for p in body["points"]}
    assert by_date[ago(0).isoformat()]["life_score"] == 7.0
    assert by_date[ago(0).isoformat()]["mood"] == 4
    assert by_date[ago(0).isoformat()]["areas"]["health"] == 8
    assert by_date[ago(1).isoformat()]["life_score"] is None, "a missed day is a gap, not a zero"
    assert by_date[ago(2).isoformat()]["life_score"] == 4.0
    ma = {p["date"]: p["value"] for p in body["moving_avg_7"]}
    assert ma[ago(1).isoformat()] == 4.0, "the moving average carries through a gap"
    assert ma[ago(0).isoformat()] == 5.5
    assert ma[ago(2).isoformat()] == 4.0
    assert ma[ago(3).isoformat()] is None, "no data in the window means no average"


@pytest.mark.asyncio
async def test_trend_range_boundaries(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    await add_checkin(db_session, uid, 6, health=5)   # first day of a 7-day range
    await add_checkin(db_session, uid, 7, health=9)   # one day outside it
    body = (await client.get(f"{API}/checkins/trend?days=7", headers=auth_headers)).json()
    assert body["points"][0]["date"] == ago(6).isoformat()
    assert body["points"][0]["life_score"] == 5.0
    assert [p["life_score"] for p in body["points"] if p["life_score"] is not None] == [5.0]
    # The day just before the range still feeds the first moving-average points.
    assert body["moving_avg_7"][0]["value"] == 7.0


@pytest.mark.asyncio
async def test_trend_ignores_other_users(client, auth_headers, db_session):
    _, other_id = await other_user(client)
    await add_checkin(db_session, other_id, 0, health=9, mood=5)
    body = (await client.get(f"{API}/checkins/trend?days=7", headers=auth_headers)).json()
    assert all(p["life_score"] is None and p["mood"] is None for p in body["points"])


@pytest.mark.asyncio
async def test_trend_requires_auth(client):
    assert (await client.get(f"{API}/checkins/trend")).status_code == 401


@pytest.mark.asyncio
async def test_life_score_uses_only_onboarding_areas(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    await client.patch(f"{API}/auth/me", json={"preferences": {"priority_area_ids": [1, 4]}}, headers=auth_headers)
    await add_checkin(db_session, uid, 0, health=8, work=6, money=2, growth=2)
    body = (await client.get(f"{API}/checkins/trend?days=7", headers=auth_headers)).json()
    assert body["points"][-1]["life_score"] == 7.0  # mean of health and work only


@pytest.mark.asyncio
async def test_saving_a_checkin_stores_the_same_life_score(client, auth_headers):
    await client.patch(f"{API}/auth/me", json={"preferences": {"priority_area_ids": [1, 4]}}, headers=auth_headers)
    today = await client.get(f"{API}/checkins/today", headers=auth_headers)
    resp = await client.patch(
        f"{API}/checkins/{today.json()['id']}", json={"score_health": 8, "score_work": 6, "score_money": 2},
        headers=auth_headers,
    )
    assert resp.json()["overall_score"] == 7.0


@pytest.mark.asyncio
async def test_today_follows_the_users_timezone(client, auth_headers):
    from zoneinfo import ZoneInfo
    # Kiritimati (UTC+14) is always a calendar day ahead of, or the same as, UTC; Pago Pago (UTC-11) behind.
    for tz in ("Pacific/Kiritimati", "Pacific/Pago_Pago"):
        try:
            ZoneInfo(tz)
        except Exception:
            pytest.skip("tzdata not installed")
        await client.patch(f"{API}/auth/me", json={"timezone": tz}, headers=auth_headers)
        resp = await client.get(f"{API}/checkins/today", headers=auth_headers)
        assert resp.json()["checkin_date"] == user_today(tz).isoformat()


# ---------------------------------------------------------------- /dashboard

@pytest.mark.asyncio
async def test_dashboard_empty_user(client, auth_headers):
    d = (await client.get(f"{API}/dashboard", headers=auth_headers)).json()
    assert d["life_score"] is None
    assert d["life_score_delta"] is None
    assert d["checkin_streak"] == 0
    assert d["checkin_consistency_30"] == [False] * 30
    assert d["highlights"] == []
    assert d["latest_insight"] is None
    assert set(d["areas"]) == {"health", "mind", "relationships", "work", "money", "growth"}
    for a in d["areas"].values():
        assert a["score"] is None and a["delta"] is None and a["sparkline_30"] == [None] * 30


@pytest.mark.asyncio
async def test_dashboard_delta_compares_with_the_previous_equal_period(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    for n in (0, 1, 2):       # current 7 days: health 8
        await add_checkin(db_session, uid, n, health=8)
    for n in (7, 8):          # previous 7 days: health 5
        await add_checkin(db_session, uid, n, health=5)
    d = (await client.get(f"{API}/dashboard?days=7", headers=auth_headers)).json()
    assert d["life_score"] == 8.0
    assert d["life_score_delta"] == 3.0
    assert d["areas"]["health"]["delta"] == 3.0
    assert d["areas"]["work"]["delta"] is None
    assert d["areas"]["health"]["sparkline_30"][-1] == 8
    assert d["areas"]["health"]["sparkline_30"][-4] is None
    assert any("Health is up 3" in h for h in d["highlights"])


@pytest.mark.asyncio
async def test_dashboard_delta_is_none_without_a_previous_period(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    await add_checkin(db_session, uid, 0, health=8)
    d = (await client.get(f"{API}/dashboard?days=7", headers=auth_headers)).json()
    assert d["life_score"] == 8.0
    assert d["life_score_delta"] is None


@pytest.mark.asyncio
async def test_dashboard_streak_and_consistency(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    for n in (0, 1, 2, 4):
        await add_checkin(db_session, uid, n, complete=True, health=7)
    await add_checkin(db_session, uid, 3, complete=False, health=7)  # started but not finished
    d = (await client.get(f"{API}/dashboard", headers=auth_headers)).json()
    assert d["checkin_streak"] == 3
    c = d["checkin_consistency_30"]
    assert len(c) == 30 and c[-1] is True and c[-4] is False and c[-5] is True and sum(c) == 4
    assert any("3-day check-in streak" in h for h in d["highlights"])


@pytest.mark.asyncio
async def test_dashboard_streak_survives_an_unfinished_today(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    for n in (1, 2):
        await add_checkin(db_session, uid, n, complete=True, health=7)
    d = (await client.get(f"{API}/dashboard", headers=auth_headers)).json()
    assert d["checkin_streak"] == 2


@pytest.mark.asyncio
async def test_dashboard_latest_insight(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    db_session.add(AIRecommendation(
        user_id=uid, recommendation_type="daily_analysis", model_used="m", created_at=stamp(2),
        raw_response={"top_insight": "Old insight"}, summary="old", action_items=[{"action": "Old", "area": "work"}],
    ))
    db_session.add(AIRecommendation(
        user_id=uid, recommendation_type="daily_analysis", model_used="m", created_at=stamp(0),
        raw_response={"top_insight": "Sleep drives your mood"}, summary="Good day",
        action_items=[{"action": "Be in bed by 11pm", "area": "health", "priority": 1}, {"action": "Second"}],
    ))
    db_session.add(AIRecommendation(
        user_id=uid, recommendation_type="daily_analysis", model_used="m", created_at=stamp(0) + timedelta(hours=1),
        raw_response={"top_insight": "Dismissed"}, is_dismissed=True,
    ))
    await db_session.flush()
    insight = (await client.get(f"{API}/dashboard", headers=auth_headers)).json()["latest_insight"]
    assert insight["insight"] == "Sleep drives your mood"
    assert insight["action"] == {"action": "Be in bed by 11pm", "area": "health", "priority": 1}
    assert insight["summary"] == "Good day"


@pytest.mark.asyncio
async def test_dashboard_never_includes_other_users_data(client, auth_headers, db_session):
    _, other_id = await other_user(client)
    await add_checkin(db_session, other_id, 0, complete=True, health=9)
    db_session.add(AIRecommendation(user_id=other_id, recommendation_type="daily_analysis", model_used="m",
                                    raw_response={"top_insight": "secret"}, summary="secret"))
    await db_session.flush()
    d = (await client.get(f"{API}/dashboard", headers=auth_headers)).json()
    assert d["life_score"] is None and d["checkin_streak"] == 0 and d["latest_insight"] is None


@pytest.mark.asyncio
async def test_dashboard_rejects_a_bad_range(client, auth_headers):
    assert (await client.get(f"{API}/dashboard?days=12", headers=auth_headers)).status_code == 422


# ---------------------------------------------------------------- /habits/completion

@pytest.mark.asyncio
async def test_habit_completion_empty_user(client, auth_headers):
    body = (await client.get(f"{API}/habits/completion?days=7", headers=auth_headers)).json()
    assert body["overall_rate"] is None and body["habits"] == []
    assert len(body["series"]) == 7 and all(s["rate"] is None for s in body["series"])


@pytest.mark.asyncio
async def test_habit_completion_series_and_30_day_rate(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    reading = await add_habit(db_session, uid, title="Read")
    gym = await add_habit(db_session, uid, title="Gym")
    for n in range(0, 15):            # Read: 15 of the last 30 days
        await log(db_session, reading, n)
    await log(db_session, gym, 0)     # Gym: just today
    await log(db_session, gym, 1, status="skipped")
    body = (await client.get(f"{API}/habits/completion?days=7", headers=auth_headers)).json()
    series = {s["date"]: s for s in body["series"]}
    assert series[ago(0).isoformat()]["rate"] == 100.0
    assert series[ago(1).isoformat()]["rate"] == 50.0, "a skipped log is not a completion"
    assert series[ago(1).isoformat()]["due"] == 2
    rates = {h["title"]: h for h in body["habits"]}
    assert rates["Read"]["rate_30"] == 50.0 and rates["Read"]["completed_30"] == 15 and rates["Read"]["expected_30"] == 30
    assert rates["Gym"]["rate_30"] == round(1 / 30 * 100, 1)
    assert body["overall_rate"] == round((7 + 1) / 14 * 100, 1)


@pytest.mark.asyncio
async def test_habit_completion_respects_created_date_and_weekdays(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    new = await add_habit(db_session, uid, created_days_ago=2, title="New")
    weekday = TODAY.weekday()
    other_day = (weekday + 1) % 7
    picky = await add_habit(db_session, uid, title="Picky", frequency_days=[other_day])
    body = (await client.get(f"{API}/habits/completion?days=7", headers=auth_headers)).json()
    series = {s["date"]: s for s in body["series"]}
    assert series[ago(5).isoformat()]["due"] == (1 if (ago(5).weekday() == other_day) else 0), "New isn't due before it existed"
    assert series[ago(0).isoformat()]["due"] == 1, "Picky isn't due today"
    assert {h["title"]: h["expected_30"] for h in body["habits"]}["New"] == 3
    assert new.id and picky.id


@pytest.mark.asyncio
async def test_habit_completion_ignores_deleted_inactive_and_other_users(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    _, other_id = await other_user(client)
    await add_habit(db_session, uid, title="Gone", deleted_at=stamp(1))
    await add_habit(db_session, uid, title="Paused", is_active=False)
    theirs = await add_habit(db_session, other_id, title="Theirs")
    await log(db_session, theirs, 0)
    body = (await client.get(f"{API}/habits/completion?days=7", headers=auth_headers)).json()
    assert body["habits"] == [] and body["overall_rate"] is None


# ---------------------------------------------------------------- /metrics/series

async def add_metric(db, uid, n_days_ago, value, key="sleep_hours", area=1, unit="h"):
    db.add(Metric(user_id=uid, life_area_id=area, metric_key=key, metric_date=ago(n_days_ago),
                  value_numeric=value, unit=unit))
    await db.flush()


@pytest.mark.asyncio
async def test_metric_series_empty(client, auth_headers):
    body = (await client.get(f"{API}/metrics/series?key=sleep_hours&days=30", headers=auth_headers)).json()
    assert body["points"] == [] and body["latest"] is None and body["delta"] is None and body["average"] is None


@pytest.mark.asyncio
async def test_metric_series_requires_a_key(client, auth_headers):
    assert (await client.get(f"{API}/metrics/series?days=30", headers=auth_headers)).status_code == 422


@pytest.mark.asyncio
async def test_metric_series_averages_per_day_and_computes_delta(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    await add_metric(db_session, uid, 0, 8)
    await add_metric(db_session, uid, 0, 6)       # two entries today -> 7
    await add_metric(db_session, uid, 3, 5)
    await add_metric(db_session, uid, 9, 4)       # previous 7-day period
    await add_metric(db_session, uid, 1, 99, key="other_key")
    body = (await client.get(f"{API}/metrics/series?key=sleep_hours&days=7", headers=auth_headers)).json()
    assert [(p["date"], p["value"], p["n"]) for p in body["points"]] == [
        (ago(3).isoformat(), 5.0, 1), (ago(0).isoformat(), 7.0, 2),
    ]
    assert body["latest"]["value"] == 7.0
    assert body["average"] == 6.0
    assert body["delta"] == 2.0
    assert body["unit"] == "h"


@pytest.mark.asyncio
async def test_metric_series_range_boundary_and_area_filter(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    await add_metric(db_session, uid, 6, 1)     # inside 7 days
    await add_metric(db_session, uid, 7, 2)     # outside (previous period)
    await add_metric(db_session, uid, 0, 3, area=2)
    inside = (await client.get(f"{API}/metrics/series?key=sleep_hours&days=7", headers=auth_headers)).json()
    assert [p["value"] for p in inside["points"]] == [1.0, 3.0]
    only_health = (await client.get(f"{API}/metrics/series?key=sleep_hours&days=7&area_id=1", headers=auth_headers)).json()
    assert [p["value"] for p in only_health["points"]] == [1.0]


@pytest.mark.asyncio
async def test_metric_series_ignores_other_users(client, auth_headers, db_session):
    _, other_id = await other_user(client)
    await add_metric(db_session, other_id, 0, 9)
    body = (await client.get(f"{API}/metrics/series?key=sleep_hours&days=30", headers=auth_headers)).json()
    assert body["points"] == []


# ---------------------------------------------------------------- /areas/{id}/summary

@pytest.mark.asyncio
@pytest.mark.parametrize("area_id", [0, 7, 99])
async def test_area_summary_unknown_area_is_404(client, auth_headers, area_id):
    assert (await client.get(f"{API}/areas/{area_id}/summary", headers=auth_headers)).status_code == 404


@pytest.mark.asyncio
async def test_area_summary_empty_user(client, auth_headers):
    body = (await client.get(f"{API}/areas/1/summary?days=30", headers=auth_headers)).json()
    assert body["area"]["slug"] == "health" and body["area"]["name"] == "Health"
    assert body["score"] is None and body["delta"] is None
    assert len(body["series"]) == 30 and all(s["score"] is None for s in body["series"])
    assert body["habits"] == [] and body["goals"] == [] and body["recommendations"] == [] and body["metrics"] == []


@pytest.mark.asyncio
async def test_area_summary_with_data(client, auth_headers, db_session):
    uid = await user_id(client, auth_headers)
    await add_checkin(db_session, uid, 0, health=8)
    await add_checkin(db_session, uid, 1, health=6)
    await add_checkin(db_session, uid, 10, health=4)  # previous 7-day period
    habit = await add_habit(db_session, uid, area=1, title="Walk")
    await add_habit(db_session, uid, area=4, title="Deep work")
    await log(db_session, habit, 0)
    db_session.add(Goal(user_id=uid, life_area_id=1, title="Run 5k", status="active", priority=3, progress_pct=40))
    db_session.add(Goal(user_id=uid, life_area_id=1, title="Done goal", status="completed", progress_pct=100))
    db_session.add(Goal(user_id=uid, life_area_id=4, title="Ship it", status="active", progress_pct=10))
    for i, (area_id, items) in enumerate([
        (None, [{"action": "Lift twice", "area": "health"}]),   # tagged through the action item
        (1, [{"action": "Sleep more"}]),                          # tagged directly
        (4, [{"action": "Plan the week", "area": "work"}]),       # a different area
        (None, [{"action": "Stretch", "area": "health"}]),
        (None, [{"action": "Hydrate", "area": "health"}]),
    ]):
        db_session.add(AIRecommendation(
            user_id=uid, recommendation_type="daily_analysis", model_used="m", life_area_id=area_id,
            created_at=stamp(5 - i), raw_response={}, summary=f"rec {i}", action_items=items,
        ))
    await add_metric(db_session, uid, 3, 7.5, key="sleep_hours", area=1)
    await add_metric(db_session, uid, 1, 8.0, key="sleep_hours", area=1)
    await add_metric(db_session, uid, 2, 10000, key="steps", area=1, unit="steps")
    await add_metric(db_session, uid, 0, 55, key="deep_work_minutes", area=4, unit="min")

    body = (await client.get(f"{API}/areas/1/summary?days=7", headers=auth_headers)).json()
    assert body["score"] == 7.0 and body["delta"] == 3.0
    assert body["series"][-1] == {"date": ago(0).isoformat(), "score": 8}
    assert [h["title"] for h in body["habits"]] == ["Walk"]
    assert [g["title"] for g in body["goals"]] == ["Run 5k"]
    assert body["goals"][0]["progress_pct"] == 40.0
    assert [r["summary"] for r in body["recommendations"]] == ["rec 4", "rec 3", "rec 1"]
    assert body["recommendations"][0]["action_items"][0]["action"] == "Hydrate"
    assert {"id", "recommendation_type", "raw_response", "insights", "user_rating", "created_at"} <= set(body["recommendations"][0])
    assert {m["key"]: (m["latest_value"], m["unit"]) for m in body["metrics"]} == {
        "sleep_hours": (8.0, "h"), "steps": (10000.0, "steps"),
    }


@pytest.mark.asyncio
async def test_area_summary_ignores_other_users(client, auth_headers, db_session):
    _, other_id = await other_user(client)
    await add_checkin(db_session, other_id, 0, health=9)
    await add_habit(db_session, other_id, area=1)
    db_session.add(Goal(user_id=other_id, life_area_id=1, title="Theirs", status="active", progress_pct=0))
    await add_metric(db_session, other_id, 0, 5)
    db_session.add(AIRecommendation(user_id=other_id, recommendation_type="x", model_used="m", life_area_id=1,
                                    raw_response={}, summary="theirs"))
    await db_session.flush()
    body = (await client.get(f"{API}/areas/1/summary", headers=auth_headers)).json()
    assert body["score"] is None and body["habits"] == [] and body["goals"] == []
    assert body["recommendations"] == [] and body["metrics"] == []


@pytest.mark.asyncio
async def test_new_endpoints_require_auth(client):
    for path in ("/habits/completion", "/metrics/series?key=x", "/areas/1/summary", "/dashboard"):
        assert (await client.get(f"{API}{path}")).status_code == 401, path
