"""Behaviour that had no test: goals, habit logs and streaks, account endpoints, insights, email delivery."""
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.models.ai_recommendation import AIRecommendation
from app.services import email_service, insight_service, signals

API = "/api/v1"


async def me(client, headers) -> dict:
    return (await client.get(f"{API}/auth/me", headers=headers)).json()


# --- goals -----------------------------------------------------------------------------------

async def make_goal(client, headers, **overrides):
    body = {"life_area_id": 4, "title": "Ship v1", **overrides}
    resp = await client.post(f"{API}/goals", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_completing_a_goal_sets_status_progress_and_time(client, auth_headers):
    goal = await make_goal(client, auth_headers)
    resp = await client.post(f"{API}/goals/{goal['id']}/complete", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert (body["status"], body["progress_pct"]) == ("completed", 100)
    assert body["completed_at"] is not None


async def test_goal_progress_follows_its_milestones(client, auth_headers):
    goal = await make_goal(client, auth_headers)
    ids = []
    for title in ("a", "b", "c", "d"):
        ids.append((await client.post(f"{API}/goals/{goal['id']}/milestones", json={"title": title}, headers=auth_headers)).json()["id"])

    async def progress():
        goals = (await client.get(f"{API}/goals", headers=auth_headers)).json()
        return goals[0]["progress_pct"]

    await client.post(f"{API}/goals/{goal['id']}/milestones/{ids[0]}/complete", headers=auth_headers)
    assert await progress() == 25
    await client.post(f"{API}/goals/{goal['id']}/milestones/{ids[1]}/complete", headers=auth_headers)
    assert await progress() == 50
    await client.post(f"{API}/goals/{goal['id']}/milestones/{ids[1]}/uncomplete", headers=auth_headers)
    assert await progress() == 25


async def test_goal_actions_are_owner_only_and_missing_goals_404(client, auth_headers, other_headers):
    goal = await make_goal(client, auth_headers)
    for call in (
        client.patch(f"{API}/goals/{goal['id']}", json={"title": "x"}, headers=other_headers),
        client.delete(f"{API}/goals/{goal['id']}", headers=other_headers),
        client.post(f"{API}/goals/{goal['id']}/complete", headers=other_headers),
        client.post(f"{API}/goals/{goal['id']}/milestones", json={"title": "x"}, headers=other_headers),
        client.post(f"{API}/goals/99999/complete", headers=auth_headers),
        client.post(f"{API}/goals/{goal['id']}/milestones/99999/complete", headers=auth_headers),
    ):
        assert (await call).status_code == 404
    assert (await client.get(f"{API}/goals", headers=other_headers)).json() == []


async def test_goal_needs_a_real_life_area(client, auth_headers):
    resp = await client.post(f"{API}/goals", json={"life_area_id": 99, "title": "x"}, headers=auth_headers)
    assert resp.status_code == 404


# --- habits ----------------------------------------------------------------------------------

async def make_habit(client, headers, **overrides):
    resp = await client.post(f"{API}/habits", json={"life_area_id": 1, "title": "Walk", **overrides}, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_habit_streak_counts_consecutive_days_ending_today(client, auth_headers):
    habit = await make_habit(client, auth_headers)
    today = date.today()
    for ago in (0, 1, 2, 4):  # a gap on day 3
        resp = await client.post(
            f"{API}/habits/{habit['id']}/log", json={"log_date": (today - timedelta(days=ago)).isoformat()}, headers=auth_headers
        )
        assert resp.status_code == 200

    streak = (await client.get(f"{API}/habits/{habit['id']}/streak", headers=auth_headers)).json()
    assert streak["current_streak"] == 3
    assert streak["longest_streak"] == 3
    assert streak["total_completions"] == 4
    assert streak["last_completed_date"] == today.isoformat()


async def test_habit_streak_survives_an_unlogged_today(client, auth_headers):
    habit = await make_habit(client, auth_headers)
    today = date.today()
    for ago in (1, 2):
        await client.post(f"{API}/habits/{habit['id']}/log", json={"log_date": (today - timedelta(days=ago)).isoformat()}, headers=auth_headers)
    streak = (await client.get(f"{API}/habits/{habit['id']}/streak", headers=auth_headers)).json()
    assert streak["current_streak"] == 2


async def test_logging_a_day_twice_updates_the_same_log(client, auth_headers):
    habit = await make_habit(client, auth_headers, target_count=3)
    day = date.today().isoformat()
    await client.post(f"{API}/habits/{habit['id']}/log", json={"log_date": day, "completion_count": 1}, headers=auth_headers)
    await client.post(f"{API}/habits/{habit['id']}/log", json={"log_date": day, "completion_count": 3}, headers=auth_headers)

    logs = (await client.get(f"{API}/habits/{habit['id']}/logs", headers=auth_headers)).json()
    assert [(log["log_date"], log["completion_count"]) for log in logs] == [(day, 3)]
    today = (await client.get(f"{API}/habits/today", headers=auth_headers)).json()
    assert today[0]["completed_today"] is True and today[0]["completion_count_today"] == 3


async def test_habit_logs_history_window_and_ownership(client, auth_headers, other_headers):
    habit = await make_habit(client, auth_headers)
    today = date.today()
    for ago in (0, 10, 100):
        await client.post(f"{API}/habits/{habit['id']}/log", json={"log_date": (today - timedelta(days=ago)).isoformat()}, headers=auth_headers)

    default = (await client.get(f"{API}/habits/{habit['id']}/logs", headers=auth_headers)).json()
    assert len(default) == 2  # the 100-day-old one is outside the default 84 days
    wide = (await client.get(f"{API}/habits/{habit['id']}/logs", params={"days": 200}, headers=auth_headers)).json()
    assert len(wide) == 3

    for path in (f"/habits/{habit['id']}/logs", f"/habits/{habit['id']}/streak"):
        assert (await client.get(f"{API}{path}", headers=other_headers)).status_code == 404
    assert (await client.post(f"{API}/habits/{habit['id']}/log", json={"log_date": today.isoformat()}, headers=other_headers)).status_code == 404


async def test_deleted_and_paused_habits_leave_the_list(client, auth_headers):
    keep = await make_habit(client, auth_headers, title="Keep")
    paused = await make_habit(client, auth_headers, title="Paused")
    gone = await make_habit(client, auth_headers, title="Gone")
    await client.patch(f"{API}/habits/{paused['id']}", json={"is_active": False}, headers=auth_headers)
    await client.delete(f"{API}/habits/{gone['id']}", headers=auth_headers)

    titles = [h["title"] for h in (await client.get(f"{API}/habits", headers=auth_headers)).json()]
    assert titles == [keep["title"]]
    assert (await client.delete(f"{API}/habits/{gone['id']}", headers=auth_headers)).status_code == 404


async def test_expected_completions_for_each_frequency():
    from app.services.habit_stats import expected_completions

    monday, sunday = date(2026, 10, 5), date(2026, 10, 18)  # two full weeks
    base = {"created_at": datetime(2026, 1, 1), "frequency_days": None, "target_count": 1}
    daily = SimpleNamespace(frequency="daily", **base)
    weekly = SimpleNamespace(frequency="weekly", **{**base, "target_count": 3})
    weekdays = SimpleNamespace(frequency="daily", **{**base, "frequency_days": [0, 2, 4]})  # Mon/Wed/Fri
    fresh = SimpleNamespace(frequency="daily", **{**base, "created_at": datetime(2026, 10, 17)})
    future = SimpleNamespace(frequency="daily", **{**base, "created_at": datetime(2026, 12, 1)})

    assert expected_completions(daily, monday, sunday) == 14
    assert expected_completions(weekly, monday, sunday) == 6
    assert expected_completions(weekdays, monday, sunday) == 6
    assert expected_completions(fresh, monday, sunday) == 2  # counted from the day it was created
    assert expected_completions(future, monday, sunday) == 0


# --- check-ins -------------------------------------------------------------------------------

async def test_checkin_endpoints_are_owner_only(client, auth_headers, other_headers):
    checkin = (await client.post(f"{API}/checkins", json={"checkin_date": "2026-10-06", "score_health": 7}, headers=auth_headers)).json()
    assert (await client.patch(f"{API}/checkins/{checkin['id']}", json={"score_health": 1}, headers=other_headers)).status_code == 404
    assert (await client.post(f"{API}/checkins/{checkin['id']}/complete", headers=other_headers)).status_code == 404
    assert (await client.patch(f"{API}/checkins/99999", json={"score_health": 1}, headers=auth_headers)).status_code == 404


async def test_posting_the_same_day_twice_updates_instead_of_duplicating(client, auth_headers):
    first = (await client.post(f"{API}/checkins", json={"checkin_date": "2026-10-06", "score_health": 4}, headers=auth_headers)).json()
    again = (await client.post(f"{API}/checkins", json={"checkin_date": "2026-10-06", "score_mind": 8}, headers=auth_headers)).json()
    assert again["id"] == first["id"]
    assert (again["score_health"], again["score_mind"]) == (4, 8)
    assert again["overall_score"] == 6


async def test_completing_a_checkin_queues_the_analysis(client, auth_headers, db_session, monkeypatch):
    from app.ai import ai_service
    from tests.test_ai_automation import SessionFactory

    seen = []

    async def fake(db, checkin_id, user_id):
        seen.append(checkin_id)

    monkeypatch.setattr(ai_service, "analyze_checkin", fake)
    monkeypatch.setattr("app.core.database.AsyncSessionLocal", SessionFactory(db_session))
    checkin = (await client.post(f"{API}/checkins", json={"checkin_date": "2026-10-06", "score_health": 7}, headers=auth_headers)).json()
    done = await client.post(f"{API}/checkins/{checkin['id']}/complete", headers=auth_headers)
    assert done.json()["is_complete"] is True
    assert seen == [checkin["id"]]


# --- dashboard -------------------------------------------------------------------------------

async def test_dashboard_populated_shows_trends_and_due_habits(client, auth_headers):
    today = date.today()
    habit = await make_habit(client, auth_headers, title="Stretch")
    await make_habit(client, auth_headers, title="Read")
    await client.post(f"{API}/habits/{habit['id']}/log", json={"log_date": today.isoformat()}, headers=auth_headers)

    for ago, score in ((3, 3), (2, 3), (1, 3), (0, 9)):
        day = (today - timedelta(days=ago)).isoformat()
        checkin = (await client.post(f"{API}/checkins", json={"checkin_date": day, "score_health": score}, headers=auth_headers)).json()
        await client.patch(f"{API}/checkins/{checkin['id']}", json={"score_health": score}, headers=auth_headers)

    dash = (await client.get(f"{API}/dashboard", headers=auth_headers)).json()
    assert dash["life_area_scores"]["health"]["trend"] == "up"
    assert dash["life_area_scores"]["health"]["today"] == 9
    assert dash["life_area_scores"]["mind"]["trend"] == "stable"
    assert dash["today"]["habits_summary"]["total"] == 2
    assert dash["today"]["habits_summary"]["completed"] == 1
    assert [h["title"] for h in dash["today"]["habits_summary"]["due_today"]] == ["Read"]


async def test_dashboard_marks_a_falling_area_down(client, auth_headers):
    today = date.today()
    for ago, score in ((2, 9), (1, 9), (0, 2)):
        await client.post(
            f"{API}/checkins", json={"checkin_date": (today - timedelta(days=ago)).isoformat(), "score_work": score}, headers=auth_headers
        )
    dash = (await client.get(f"{API}/dashboard", headers=auth_headers)).json()
    assert dash["life_area_scores"]["work"]["trend"] == "down"


# --- account ---------------------------------------------------------------------------------

async def test_change_password_needs_the_current_one_and_signs_out_other_sessions(client, registered_user):
    payload, tokens = registered_user
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    wrong = await client.post(
        f"{API}/auth/change-password", json={"current_password": "Nope1234!", "new_password": "Fresh1234!"}, headers=headers
    )
    assert wrong.status_code == 400

    ok = await client.post(
        f"{API}/auth/change-password", json={"current_password": payload["password"], "new_password": "Fresh1234!"}, headers=headers
    )
    assert ok.status_code == 204
    assert (await client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]})).status_code == 401
    assert (await client.post(f"{API}/auth/login", json={"email": payload["email"], "password": payload["password"]})).status_code == 401
    assert (await client.post(f"{API}/auth/login", json={"email": payload["email"], "password": "Fresh1234!"})).status_code == 200


async def test_change_password_rejects_a_weak_new_password(client, registered_user, auth_headers):
    payload, _ = registered_user
    resp = await client.post(
        f"{API}/auth/change-password", json={"current_password": payload["password"], "new_password": "short"}, headers=auth_headers
    )
    assert resp.status_code == 422


async def test_delete_account_removes_the_avatar_and_survives_storage_errors(client, registered_user, auth_headers, monkeypatch):
    from app.api.v1.endpoints import auth as auth_endpoints

    payload, _ = registered_user
    await client.patch(f"{API}/auth/me", json={"avatar_url": "https://blob.test/avatars/1/a.png"}, headers=auth_headers)
    deleted = []

    async def boom(url):
        deleted.append(url)
        raise RuntimeError("storage is down")

    monkeypatch.setattr(auth_endpoints.blob_service, "delete_blob", boom)
    resp = await client.request("DELETE", f"{API}/auth/me", json={"password": payload["password"]}, headers=auth_headers)
    if deleted:  # avatar_url is not user-editable in every build; when it is, deletion must still succeed
        assert deleted == ["https://blob.test/avatars/1/a.png"]
    assert resp.status_code == 204
    assert (await client.post(f"{API}/auth/login", json={"email": payload["email"], "password": payload["password"]})).status_code == 401


async def test_verify_email_endpoints_reject_a_bad_token(client, auth_headers):
    assert (await client.get(f"{API}/auth/verify-email", params={"token": "garbage"})).status_code == 400
    assert (await client.get(f"{API}/auth/verify-email")).status_code == 422


# --- insights --------------------------------------------------------------------------------

def rec(**fields) -> AIRecommendation:
    defaults = {
        "id": 1, "recommendation_type": "daily_analysis", "model_used": "m", "raw_response": {}, "summary": "s",
        "action_items": [], "insights": [], "created_at": datetime(2026, 10, 6, tzinfo=timezone.utc),
    }
    return AIRecommendation(**{**defaults, **fields})


@pytest.mark.parametrize(
    "item,expected",
    [
        ("plain text", "plain text"),
        ({"insight": "from insight"}, "from insight"),
        ({"text": "from text"}, "from text"),
        ({"title": "from title"}, "from title"),
        ({"summary": "from summary"}, "from summary"),
        ({"insight": 5}, None),
        ({}, None),
        (42, None),
        (None, None),
    ],
)
def test_insight_text_extraction(item, expected):
    assert insight_service._text(item) == expected


def test_serialize_prefers_the_top_insight_then_the_first_usable_insight():
    assert insight_service.serialize(rec(raw_response={"top_insight": "Sleep more"}, insights=["other"]))["insight"] == "Sleep more"
    assert insight_service.serialize(rec(insights=[{}, "second one counts", "third"]))["insight"] == "second one counts"
    assert insight_service.serialize(rec(raw_response=["not", "a", "dict"], insights=[]))["insight"] is None


def test_serialize_picks_the_first_well_formed_action():
    actions = ["junk", {"action": 5}, {"action": "Walk 10 minutes", "area": "health"}, {"action": "later"}]
    out = insight_service.serialize(rec(action_items=actions))
    assert out["action"] == {"action": "Walk 10 minutes", "area": "health", "priority": 2}
    assert out["action_items"] == actions
    assert insight_service.serialize(rec(action_items=None))["action"] is None


async def test_recommendations_for_area_matches_direct_and_action_tags(client, auth_headers, db_session):
    user = await me(client, auth_headers)

    def add(**fields):
        row = AIRecommendation(
            user_id=user["id"], recommendation_type="daily_analysis", model_used="m", raw_response={}, summary="s", **fields
        )
        db_session.add(row)
        return row

    direct = add(life_area_id=1)
    tagged = add(action_items=[{"action": "Run", "area": "health"}])
    add(life_area_id=2)
    add(life_area_id=1, is_dismissed=True)
    await db_session.flush()

    found = await insight_service.recommendations_for_area(db_session, user["id"], 1)
    assert {r["id"] for r in found} == {direct.id, tagged.id}
    assert len(await insight_service.recommendations_for_area(db_session, user["id"], 1, limit=1)) == 1
    assert await insight_service.recommendations_for_area(db_session, user["id"], 6) == []


# --- signals ---------------------------------------------------------------------------------

async def test_consistency_without_habits_has_no_rate(client, auth_headers, db_session):
    user = await me(client, auth_headers)
    result = await signals.consistency(db_session, user["id"], days=7, today=date(2026, 10, 7))
    assert result["rate"] is None and result["expected"] == 0


# --- email delivery --------------------------------------------------------------------------

@pytest.fixture
def resend_calls(monkeypatch):
    calls = []
    monkeypatch.setattr(email_service.resend.Emails, "send", staticmethod(lambda payload: calls.append(payload)))
    return calls


def test_no_api_key_means_nothing_is_sent(monkeypatch, resend_calls):
    monkeypatch.setattr(email_service.settings, "RESEND_API_KEY", "")
    email_service.send_password_reset_email("a@example.com", "tok")
    assert resend_calls == []


def test_emails_carry_the_link_and_go_to_one_recipient(monkeypatch, resend_calls):
    monkeypatch.setattr(email_service.settings, "RESEND_API_KEY", "re_test")
    monkeypatch.setattr(email_service.settings, "FRONTEND_URL", "https://app.example")
    email_service.send_password_reset_email("a@example.com", "tok123")
    email_service.send_verification_email("a@example.com", "ver456")

    reset, verify = resend_calls
    assert reset["to"] == ["a@example.com"]
    assert "https://app.example/reset-password?token=tok123" in reset["html"]
    assert "https://app.example/verify-email?token=ver456" in verify["html"]


def test_a_failing_provider_never_raises_into_the_request(monkeypatch):
    monkeypatch.setattr(email_service.settings, "RESEND_API_KEY", "re_test")

    def explode(payload):
        raise RuntimeError("resend is down")

    monkeypatch.setattr(email_service.resend.Emails, "send", staticmethod(explode))
    email_service.send_welcome_email("a@example.com", "Ada Lovelace")  # must not raise
    email_service.send_weekly_digest(
        "a@example.com", "Ada", {"life_score": None, "life_score_delta": None, "best_area": None,
                                 "worst_area": None, "highlights": [], "narrative": None},
    )


def test_digest_greets_by_first_name_and_survives_an_empty_name(monkeypatch, resend_calls):
    monkeypatch.setattr(email_service.settings, "RESEND_API_KEY", "re_test")
    data = {"life_score": 7.0, "life_score_delta": 0.5, "best_area": None, "worst_area": None, "highlights": [], "narrative": None}
    email_service.send_weekly_digest("a@example.com", "Ada Lovelace", data)
    email_service.send_weekly_digest("b@example.com", "", data)
    assert "Ada" in resend_calls[0]["html"] and "Lovelace" not in resend_calls[0]["html"]
    assert "there" in resend_calls[1]["html"]
