"""The analysis endpoints and the digest trigger. The AI service is stubbed: nothing here calls Anthropic."""
from datetime import date, datetime, timezone

import pytest
from sqlalchemy import select, update

from app.ai import ai_service
from app.api.v1.endpoints import notifications
from app.core.config import settings
from app.models.ai_recommendation import AIRecommendation, WeeklyReview
from app.models.user import User
from tests.test_ai_automation import SessionFactory

API = "/api/v1"
SECRET = "test-scheduler-secret"
WEEK = "2026-10-05"


async def me(client, headers) -> dict:
    return (await client.get(f"{API}/auth/me", headers=headers)).json()


async def add_rec(db, user_id, **fields) -> AIRecommendation:
    defaults = {
        "recommendation_type": "daily_analysis", "model_used": "test-model", "raw_response": {},
        "summary": "A summary", "action_items": [], "insights": [],
    }
    rec = AIRecommendation(user_id=user_id, **{**defaults, **fields})
    db.add(rec)
    await db.flush()
    return rec


@pytest.fixture
def stub_background(db_session, monkeypatch):
    """Record what the background tasks would have asked the AI service, using the test's own session."""
    calls = {"checkin": [], "weekly": []}

    async def analyze_checkin(db, checkin_id, user_id):
        calls["checkin"].append((checkin_id, user_id))

    async def generate_weekly_review(db, user_id, week_start):
        calls["weekly"].append((user_id, week_start))

    monkeypatch.setattr(ai_service, "analyze_checkin", analyze_checkin)
    monkeypatch.setattr(ai_service, "generate_weekly_review", generate_weekly_review)
    monkeypatch.setattr("app.core.database.AsyncSessionLocal", SessionFactory(db_session))
    return calls


# --- re-running a check-in analysis ----------------------------------------------------------

async def test_retrigger_analysis_for_a_completed_checkin(client, auth_headers, stub_background):
    checkin = (await client.post(f"{API}/checkins", json={"checkin_date": "2026-10-06", "score_health": 7}, headers=auth_headers)).json()
    await client.post(f"{API}/checkins/{checkin['id']}/complete", headers=auth_headers)
    stub_background["checkin"].clear()  # completing queued one already

    resp = await client.post(f"{API}/analysis/checkin/{checkin['id']}", headers=auth_headers)
    assert resp.status_code == 202
    assert stub_background["checkin"] == [(checkin["id"], (await me(client, auth_headers))["id"])]


async def test_retrigger_needs_a_completed_checkin(client, auth_headers, stub_background):
    checkin = (await client.post(f"{API}/checkins", json={"checkin_date": "2026-10-06", "score_health": 7}, headers=auth_headers)).json()
    resp = await client.post(f"{API}/analysis/checkin/{checkin['id']}", headers=auth_headers)
    assert resp.status_code == 400
    assert stub_background["checkin"] == []


async def test_retrigger_is_scoped_to_the_owner(client, auth_headers, other_headers, stub_background):
    checkin = (await client.post(f"{API}/checkins", json={"checkin_date": "2026-10-06", "score_health": 7}, headers=auth_headers)).json()
    await client.post(f"{API}/checkins/{checkin['id']}/complete", headers=auth_headers)
    assert (await client.post(f"{API}/analysis/checkin/{checkin['id']}", headers=other_headers)).status_code == 404
    assert (await client.post(f"{API}/analysis/checkin/999999", headers=auth_headers)).status_code == 404


async def test_ai_endpoints_stop_at_the_daily_cap(client, auth_headers, db_session, stub_background, monkeypatch):
    user = await me(client, auth_headers)
    monkeypatch.setattr(settings, "AI_MAX_DAILY_CALLS_PER_USER", 2)
    await add_rec(db_session, user["id"])
    await add_rec(db_session, user["id"], recommendation_type="on_demand")

    checkin = (await client.post(f"{API}/checkins", json={"checkin_date": "2026-10-06", "score_health": 7}, headers=auth_headers)).json()
    await client.post(f"{API}/checkins/{checkin['id']}/complete", headers=auth_headers)

    for path, body in (
        (f"/analysis/checkin/{checkin['id']}", None),
        ("/analysis/on-demand", {"question": "How am I doing?"}),
        ("/analysis/reviews/weekly", {"week_start": WEEK}),
    ):
        resp = await client.post(f"{API}{path}", json=body, headers=auth_headers)
        assert resp.status_code == 429, path
        assert "Daily AI limit" in resp.json()["detail"]
    assert stub_background["weekly"] == []


# --- on-demand -------------------------------------------------------------------------------

async def test_on_demand_returns_the_recommendation(client, auth_headers, db_session, monkeypatch):
    user = await me(client, auth_headers)
    rec = await add_rec(db_session, user["id"], source_type="on_demand")
    asked = []

    async def fake(db, user_id, question, areas):
        asked.append((user_id, question, areas))
        return rec

    monkeypatch.setattr(ai_service, "on_demand_analysis", fake)
    resp = await client.post(
        f"{API}/analysis/on-demand", json={"question": "Why am I tired?", "context_areas": ["health"]}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == rec.id
    assert asked == [(user["id"], "Why am I tired?", ["health"])]


async def test_on_demand_failure_is_a_clean_503(client, auth_headers, monkeypatch):
    async def fake(*a, **k):
        return None

    monkeypatch.setattr(ai_service, "on_demand_analysis", fake)
    resp = await client.post(f"{API}/analysis/on-demand", json={"question": "Hello?"}, headers=auth_headers)
    assert resp.status_code == 503
    assert resp.json()["detail"] == "AI analysis failed"


# --- recommendations -------------------------------------------------------------------------

async def test_recommendations_list_filters_and_hides_dismissed(client, auth_headers, db_session):
    user = await me(client, auth_headers)
    await add_rec(db_session, user["id"], recommendation_type="daily_analysis")
    await add_rec(db_session, user["id"], recommendation_type="on_demand")
    await add_rec(db_session, user["id"], recommendation_type="on_demand", is_dismissed=True)

    async def listed(**params):
        resp = await client.get(f"{API}/analysis/recommendations", params=params, headers=auth_headers)
        assert resp.status_code == 200
        return resp.json()

    assert len(await listed()) == 2
    assert len(await listed(include_dismissed=True)) == 3
    assert {r["recommendation_type"] for r in await listed(type="on_demand")} == {"on_demand"}
    assert len(await listed(type="on_demand", include_dismissed=True)) == 2
    assert len(await listed(limit=1)) == 1
    assert len(await listed(limit=1, offset=1)) == 1


async def test_recommendations_are_private(client, auth_headers, other_headers, db_session):
    user = await me(client, auth_headers)
    rec = await add_rec(db_session, user["id"])
    assert (await client.get(f"{API}/analysis/recommendations", headers=other_headers)).json() == []
    resp = await client.patch(f"{API}/analysis/recommendations/{rec.id}", json={"is_dismissed": True}, headers=other_headers)
    assert resp.status_code == 404


async def test_recommendation_can_be_dismissed_actioned_and_rated(client, auth_headers, db_session):
    user = await me(client, auth_headers)
    rec = await add_rec(db_session, user["id"])
    resp = await client.patch(
        f"{API}/analysis/recommendations/{rec.id}",
        json={"is_dismissed": True, "is_actioned": True, "user_rating": 5},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert (resp.json()["is_dismissed"], resp.json()["is_actioned"], resp.json()["user_rating"]) == (True, True, 5)
    assert (await client.patch(f"{API}/analysis/recommendations/99999", json={"is_dismissed": True}, headers=auth_headers)).status_code == 404


# --- weekly reviews --------------------------------------------------------------------------

async def test_weekly_review_request_returns_a_pending_skeleton_and_queues_generation(client, auth_headers, stub_background):
    resp = await client.post(f"{API}/analysis/reviews/weekly", json={"week_start": WEEK}, headers=auth_headers)
    assert resp.status_code == 202
    body = resp.json()
    assert (body["generation_status"], body["week_start_date"], body["week_end_date"]) == ("pending", WEEK, "2026-10-11")
    assert stub_background["weekly"] == [((await me(client, auth_headers))["id"], date(2026, 10, 5))]


async def test_weekly_review_request_returns_the_existing_review(client, auth_headers, db_session, stub_background):
    user = await me(client, auth_headers)
    db_session.add(WeeklyReview(
        user_id=user["id"], week_start_date=date(2026, 10, 5), week_end_date=date(2026, 10, 11),
        avg_scores={}, generation_status="completed", ai_narrative="Done already",
    ))
    await db_session.flush()

    resp = await client.post(f"{API}/analysis/reviews/weekly", json={"week_start": WEEK}, headers=auth_headers)
    assert resp.status_code == 202
    assert resp.json()["ai_narrative"] == "Done already"
    reviews = (await db_session.scalars(select(WeeklyReview).where(WeeklyReview.user_id == user["id"]))).all()
    assert len(reviews) == 1


async def test_weekly_reviews_list_newest_first_and_private(client, auth_headers, other_headers, db_session):
    user = await me(client, auth_headers)
    for start in (date(2026, 9, 21), date(2026, 10, 5), date(2026, 9, 28)):
        db_session.add(WeeklyReview(
            user_id=user["id"], week_start_date=start, week_end_date=start, avg_scores={}, generation_status="completed",
        ))
    await db_session.flush()

    listed = (await client.get(f"{API}/analysis/reviews/weekly", headers=auth_headers)).json()
    assert [r["week_start_date"] for r in listed] == ["2026-10-05", "2026-09-28", "2026-09-21"]
    assert len((await client.get(f"{API}/analysis/reviews/weekly", params={"limit": 2}, headers=auth_headers)).json()) == 2
    assert (await client.get(f"{API}/analysis/reviews/weekly", headers=other_headers)).json() == []
    assert (await client.get(f"{API}/analysis/reviews/weekly", params={"limit": 53}, headers=auth_headers)).status_code == 422


# --- scheduler endpoints ---------------------------------------------------------------------

@pytest.fixture
def scheduler(monkeypatch):
    monkeypatch.setattr(settings, "DIGEST_SECRET", SECRET)
    return {"x-digest-secret": SECRET}


@pytest.mark.parametrize("path", ["/notifications/weekly-digest", "/analysis/weekly-reviews/generate-all"])
async def test_scheduler_endpoints_reject_missing_wrong_and_unset_secrets(client, scheduler, monkeypatch, path):
    assert (await client.post(f"{API}{path}")).status_code == 401
    assert (await client.post(f"{API}{path}", headers={"x-digest-secret": "nope"})).status_code == 401
    assert (await client.post(f"{API}{path}", headers={"x-digest-secret": SECRET + "x"})).status_code == 401

    monkeypatch.setattr(settings, "DIGEST_SECRET", "")  # an unset secret switches the endpoint off, even for ""
    assert (await client.post(f"{API}{path}", headers={"x-digest-secret": ""})).status_code == 401
    assert (await client.post(f"{API}{path}", headers=scheduler)).status_code == 401


async def test_digest_is_queued_only_for_verified_opted_in_users(client, auth_headers, db_session, scheduler, monkeypatch):
    user = await me(client, auth_headers)
    sent = []
    monkeypatch.setattr(notifications, "send_weekly_digest", lambda to, name, data: sent.append(to))
    other = await client.post(f"{API}/auth/register", json={"email": "off@example.com", "password": "Test1234!", "full_name": "Off"})
    assert other.status_code == 201

    async def run():
        sent.clear()
        resp = await client.post(f"{API}/notifications/weekly-digest", headers=scheduler)
        assert resp.status_code == 202
        return resp.json()["queued"], sorted(sent)

    assert await run() == (0, [])  # nobody has verified their email yet

    now = datetime.now(timezone.utc)
    await db_session.execute(update(User).values(email_verified_at=now))
    await db_session.execute(update(User).where(User.email == "off@example.com").values(digest_enabled=False))
    assert await run() == (1, [user["email"]])

    await db_session.execute(update(User).where(User.id == user["id"]).values(is_active=False))
    assert await run() == (0, [])


async def test_one_broken_digest_does_not_stop_the_rest(client, auth_headers, db_session, scheduler, monkeypatch):
    await client.post(f"{API}/auth/register", json={"email": "second@example.com", "password": "Test1234!", "full_name": "Second"})
    await db_session.execute(update(User).values(email_verified_at=datetime.now(timezone.utc)))
    sent = []
    monkeypatch.setattr(notifications, "send_weekly_digest", lambda to, name, data: sent.append(to))

    real = notifications.digest.build_digest

    async def flaky(db, user, today):
        if user.email == "test@example.com":
            raise RuntimeError("bad data")
        return await real(db, user, today)

    monkeypatch.setattr(notifications.digest, "build_digest", flaky)
    resp = await client.post(f"{API}/notifications/weekly-digest", headers=scheduler)
    assert resp.status_code == 202 and resp.json() == {"queued": 1}
    assert sent == ["second@example.com"]


async def test_generate_all_hands_the_week_to_the_batch(client, scheduler, monkeypatch):
    from app.ai import batch

    seen = []

    async def fake_batch(factory, *, week_start=None, **kw):
        seen.append(week_start)

    monkeypatch.setattr(batch, "generate_all_weekly", fake_batch)
    assert (await client.post(f"{API}/analysis/weekly-reviews/generate-all", headers=scheduler)).status_code == 202
    assert (await client.post(f"{API}/analysis/weekly-reviews/generate-all", params={"week_start": WEEK}, headers=scheduler)).status_code == 202
    assert seen == [None, date(2026, 10, 5)]
