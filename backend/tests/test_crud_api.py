"""Sessions, journals and metrics: create / read / update / delete, filters, validation and ownership."""
from datetime import datetime, timedelta, timezone

import pytest

API = "/api/v1"
NOW = datetime(2026, 10, 7, 9, 0, tzinfo=timezone.utc)


# --- sessions --------------------------------------------------------------------------------

def session_body(**overrides):
    body = {"life_area_id": 4, "title": "Deep block", "started_at": NOW.isoformat(), "session_type": "deep_work"}
    return {**body, **overrides}


async def test_session_duration_is_computed_from_timestamps(client, auth_headers):
    resp = await client.post(
        f"{API}/sessions",
        json=session_body(ended_at=(NOW + timedelta(minutes=45)).isoformat()),
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["duration_minutes"] == 45


async def test_session_duration_is_at_least_one_minute(client, auth_headers):
    resp = await client.post(
        f"{API}/sessions",
        json=session_body(ended_at=(NOW + timedelta(seconds=5)).isoformat()),
        headers=auth_headers,
    )
    assert resp.json()["duration_minutes"] == 1


async def test_session_explicit_duration_wins(client, auth_headers):
    resp = await client.post(
        f"{API}/sessions",
        json=session_body(ended_at=(NOW + timedelta(minutes=45)).isoformat(), duration_minutes=20),
        headers=auth_headers,
    )
    assert resp.json()["duration_minutes"] == 20


@pytest.mark.parametrize(
    "overrides",
    [{"session_type": "napping"}, {"quality_rating": 0}, {"quality_rating": 6}, {"title": None}],
    ids=["bad-type", "quality-low", "quality-high", "no-title"],
)
async def test_session_validation(client, auth_headers, overrides):
    resp = await client.post(f"{API}/sessions", json=session_body(**overrides), headers=auth_headers)
    assert resp.status_code == 422


async def test_session_list_filters_and_paginates(client, auth_headers):
    for area, hours in ((4, 0), (4, 1), (6, 2)):
        await client.post(
            f"{API}/sessions",
            json=session_body(life_area_id=area, started_at=(NOW + timedelta(hours=hours)).isoformat()),
            headers=auth_headers,
        )

    everything = (await client.get(f"{API}/sessions", headers=auth_headers)).json()
    assert len(everything) == 3
    assert [s["life_area_id"] for s in everything] == [6, 4, 4]  # newest first

    work = (await client.get(f"{API}/sessions", params={"life_area_id": 4}, headers=auth_headers)).json()
    assert len(work) == 2 and all(s["life_area_id"] == 4 for s in work)

    page = (await client.get(f"{API}/sessions", params={"limit": 1, "offset": 1}, headers=auth_headers)).json()
    assert len(page) == 1 and page[0]["id"] == everything[1]["id"]

    assert (await client.get(f"{API}/sessions", params={"limit": 0}, headers=auth_headers)).status_code == 422


async def test_session_update_fills_in_duration_when_ended(client, auth_headers):
    created = (await client.post(f"{API}/sessions", json=session_body(), headers=auth_headers)).json()
    assert created["duration_minutes"] is None

    resp = await client.patch(
        f"{API}/sessions/{created['id']}",
        json={"ended_at": (NOW + timedelta(minutes=30)).isoformat(), "title": "Renamed", "quality_rating": 4},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert (body["duration_minutes"], body["title"], body["quality_rating"]) == (30, "Renamed", 4)


async def test_session_delete_hides_it_everywhere(client, auth_headers):
    created = (await client.post(f"{API}/sessions", json=session_body(duration_minutes=30), headers=auth_headers)).json()
    assert (await client.delete(f"{API}/sessions/{created['id']}", headers=auth_headers)).status_code == 204

    assert (await client.get(f"{API}/sessions", headers=auth_headers)).json() == []
    assert (await client.patch(f"{API}/sessions/{created['id']}", json={"title": "x"}, headers=auth_headers)).status_code == 404
    assert (await client.delete(f"{API}/sessions/{created['id']}", headers=auth_headers)).status_code == 404


async def test_session_belongs_to_its_owner(client, auth_headers, other_headers):
    created = (await client.post(f"{API}/sessions", json=session_body(), headers=auth_headers)).json()
    assert (await client.patch(f"{API}/sessions/{created['id']}", json={"title": "mine now"}, headers=other_headers)).status_code == 404
    assert (await client.delete(f"{API}/sessions/{created['id']}", headers=other_headers)).status_code == 404
    assert (await client.get(f"{API}/sessions", headers=other_headers)).json() == []


async def test_session_stats_group_by_week_and_area(client, auth_headers):
    monday = datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())
    last_week = monday - timedelta(days=7)
    for when, minutes, area in ((monday, 60, 4), (monday, 30, 6), (last_week, 45, 4)):
        await client.post(
            f"{API}/sessions",
            json=session_body(started_at=when.isoformat(), duration_minutes=minutes, life_area_id=area),
            headers=auth_headers,
        )

    stats = (await client.get(f"{API}/sessions/stats", headers=auth_headers)).json()
    assert stats["total_minutes"] == 135 and stats["session_count"] == 3
    assert stats["by_area"] == {"4": 105, "6": 30}
    assert [w["minutes"] for w in stats["by_week"]] == [45, 90]  # oldest week first
    assert stats["by_week"][1]["count"] == 2


# --- journals --------------------------------------------------------------------------------

def journal_body(**overrides):
    body = {"entry_date": "2026-10-06", "content": "Long enough to be worth a summary, honestly."}
    return {**body, **overrides}


@pytest.fixture(autouse=False)
def no_ai(monkeypatch):
    """Journal writes queue an AI summary; these tests are about the CRUD, so make that a no-op."""
    from app.api.v1.endpoints import journals

    monkeypatch.setattr(journals, "_queue_analysis", lambda *a, **k: None)


async def test_journal_create_get_update_delete(client, auth_headers, no_ai):
    created = await client.post(f"{API}/journals", json=journal_body(title="Tuesday", mood_tag="focused"), headers=auth_headers)
    assert created.status_code == 201
    entry = created.json()
    assert entry["ai_status"] == "pending" and entry["mood_tag"] == "focused"

    fetched = await client.get(f"{API}/journals/{entry['id']}", headers=auth_headers)
    assert fetched.status_code == 200 and fetched.json()["title"] == "Tuesday"

    updated = await client.patch(
        f"{API}/journals/{entry['id']}", json={"title": "Wednesday", "life_area_tags": ["work"]}, headers=auth_headers
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Wednesday" and updated.json()["life_area_tags"] == ["work"]
    assert updated.json()["ai_status"] == "pending"  # untouched by a title or tag edit

    assert (await client.delete(f"{API}/journals/{entry['id']}", headers=auth_headers)).status_code == 204
    assert (await client.get(f"{API}/journals/{entry['id']}", headers=auth_headers)).status_code == 404
    assert (await client.get(f"{API}/journals", headers=auth_headers)).json() == []


@pytest.mark.parametrize(
    "overrides",
    [{"content": "   "}, {"mood_tag": "ecstatic"}, {"life_area_tags": ["sleep"]}, {"entry_date": "tomorrow"}],
    ids=["blank", "bad-mood", "bad-area", "bad-date"],
)
async def test_journal_validation(client, auth_headers, no_ai, overrides):
    assert (await client.post(f"{API}/journals", json=journal_body(**overrides), headers=auth_headers)).status_code == 422


@pytest.mark.parametrize("payload", [{"content": ""}, {"mood_tag": "meh"}, {"life_area_tags": ["x"]}])
async def test_journal_update_validation(client, auth_headers, no_ai, payload):
    entry = (await client.post(f"{API}/journals", json=journal_body(), headers=auth_headers)).json()
    assert (await client.patch(f"{API}/journals/{entry['id']}", json=payload, headers=auth_headers)).status_code == 422


async def test_journal_list_filters(client, auth_headers, no_ai):
    rows = [
        ("2026-10-01", "grateful", ["health"]),
        ("2026-10-03", "anxious", ["work", "money"]),
        ("2026-10-05", "grateful", ["work"]),
    ]
    for day, mood, tags in rows:
        await client.post(
            f"{API}/journals", json=journal_body(entry_date=day, mood_tag=mood, life_area_tags=tags), headers=auth_headers
        )

    async def days(**params):
        resp = await client.get(f"{API}/journals", params=params, headers=auth_headers)
        assert resp.status_code == 200
        return [e["entry_date"] for e in resp.json()]

    assert await days() == ["2026-10-05", "2026-10-03", "2026-10-01"]
    assert await days(entry_date_from="2026-10-02") == ["2026-10-05", "2026-10-03"]
    assert await days(entry_date_to="2026-10-03") == ["2026-10-03", "2026-10-01"]
    assert await days(entry_date_from="2026-10-02", entry_date_to="2026-10-04") == ["2026-10-03"]
    assert await days(mood_tag="grateful") == ["2026-10-05", "2026-10-01"]
    assert await days(limit=1, offset=1) == ["2026-10-03"]


async def test_journal_belongs_to_its_owner(client, auth_headers, other_headers, no_ai):
    entry = (await client.post(f"{API}/journals", json=journal_body(), headers=auth_headers)).json()
    for call in (
        client.get(f"{API}/journals/{entry['id']}", headers=other_headers),
        client.patch(f"{API}/journals/{entry['id']}", json={"title": "x"}, headers=other_headers),
        client.delete(f"{API}/journals/{entry['id']}", headers=other_headers),
    ):
        assert (await call).status_code == 404
    assert (await client.get(f"{API}/journals", headers=other_headers)).json() == []


async def test_journal_analysis_is_queued_only_when_the_text_changes(client, auth_headers, monkeypatch):
    from app.api.v1.endpoints import journals

    queued = []
    monkeypatch.setattr(journals, "_queue_analysis", lambda bg, entry_id, user_id: queued.append(entry_id))

    entry = (await client.post(f"{API}/journals", json=journal_body(), headers=auth_headers)).json()
    assert queued == [entry["id"]]

    await client.patch(f"{API}/journals/{entry['id']}", json={"title": "new title"}, headers=auth_headers)
    await client.patch(f"{API}/journals/{entry['id']}", json={"content": entry["content"]}, headers=auth_headers)
    assert queued == [entry["id"]]

    edited = await client.patch(f"{API}/journals/{entry['id']}", json={"content": "A different, longer thought."}, headers=auth_headers)
    assert queued == [entry["id"], entry["id"]]
    assert edited.json()["ai_status"] == "pending"


async def test_journal_background_task_runs_the_analysis(client, auth_headers, db_session, monkeypatch):
    """The real _queue_analysis opens its own session and hands the entry to the AI service."""
    from app.ai import ai_service
    from tests.test_ai_automation import SessionFactory

    seen = []

    async def fake_analyze(db, entry_id, user_id):
        seen.append((entry_id, user_id))

    monkeypatch.setattr(ai_service, "analyze_journal", fake_analyze)
    monkeypatch.setattr("app.core.database.AsyncSessionLocal", SessionFactory(db_session))

    entry = (await client.post(f"{API}/journals", json=journal_body(), headers=auth_headers)).json()
    assert seen == [(entry["id"], entry["user_id"])]


# --- metrics ---------------------------------------------------------------------------------

def metric_body(**overrides):
    body = {"life_area_id": 1, "metric_key": "sleep_hours", "metric_date": "2026-10-06", "value_numeric": 7.5, "unit": "h"}
    return {**body, **overrides}


async def test_metric_crud(client, auth_headers):
    created = await client.post(f"{API}/metrics", json=metric_body(metric_key="  sleep_hours  "), headers=auth_headers)
    assert created.status_code == 201
    metric = created.json()
    assert metric["metric_key"] == "sleep_hours" and metric["value_numeric"] == 7.5

    assert (await client.get(f"{API}/metrics/{metric['id']}", headers=auth_headers)).json()["unit"] == "h"

    updated = await client.patch(
        f"{API}/metrics/{metric['id']}", json={"value_numeric": 8, "metric_date": "2026-10-05"}, headers=auth_headers
    )
    assert updated.status_code == 200
    assert (updated.json()["value_numeric"], updated.json()["metric_date"]) == (8, "2026-10-05")

    assert (await client.delete(f"{API}/metrics/{metric['id']}", headers=auth_headers)).status_code == 204
    assert (await client.get(f"{API}/metrics/{metric['id']}", headers=auth_headers)).status_code == 404


@pytest.mark.parametrize(
    "overrides",
    [{"life_area_id": 9}, {"metric_key": "   "}, {"metric_key": "k" * 101}, {"unit": "u" * 51}],
    ids=["bad-area", "blank-key", "long-key", "long-unit"],
)
async def test_metric_validation(client, auth_headers, overrides):
    assert (await client.post(f"{API}/metrics", json=metric_body(**overrides), headers=auth_headers)).status_code == 422


async def test_metric_update_rejects_a_long_unit(client, auth_headers):
    metric = (await client.post(f"{API}/metrics", json=metric_body(), headers=auth_headers)).json()
    resp = await client.patch(f"{API}/metrics/{metric['id']}", json={"unit": "u" * 51}, headers=auth_headers)
    assert resp.status_code == 422


async def test_metric_list_filters(client, auth_headers):
    rows = [
        (1, "sleep_hours", "2026-10-01"),
        (1, "steps", "2026-10-02"),
        (2, "meditation_min", "2026-10-03"),
        (1, "sleep_hours", "2026-10-04"),
    ]
    for area, key, day in rows:
        await client.post(
            f"{API}/metrics", json=metric_body(life_area_id=area, metric_key=key, metric_date=day), headers=auth_headers
        )

    async def found(**params):
        resp = await client.get(f"{API}/metrics", params=params, headers=auth_headers)
        assert resp.status_code == 200
        return [(m["metric_key"], m["metric_date"]) for m in resp.json()]

    assert len(await found()) == 4
    assert (await found())[0] == ("sleep_hours", "2026-10-04")  # newest first
    assert await found(life_area_id=2) == [("meditation_min", "2026-10-03")]
    assert await found(metric_key="sleep_hours") == [("sleep_hours", "2026-10-04"), ("sleep_hours", "2026-10-01")]
    assert await found(date_from="2026-10-03") == [("sleep_hours", "2026-10-04"), ("meditation_min", "2026-10-03")]
    assert await found(date_to="2026-10-02") == [("steps", "2026-10-02"), ("sleep_hours", "2026-10-01")]
    assert await found(life_area_id=1, date_from="2026-10-02", date_to="2026-10-03") == [("steps", "2026-10-02")]
    assert await found(limit=1, offset=3) == [("sleep_hours", "2026-10-01")]


async def test_metric_belongs_to_its_owner(client, auth_headers, other_headers):
    metric = (await client.post(f"{API}/metrics", json=metric_body(), headers=auth_headers)).json()
    for call in (
        client.get(f"{API}/metrics/{metric['id']}", headers=other_headers),
        client.patch(f"{API}/metrics/{metric['id']}", json={"value_numeric": 1}, headers=other_headers),
        client.delete(f"{API}/metrics/{metric['id']}", headers=other_headers),
    ):
        assert (await call).status_code == 404
    assert (await client.get(f"{API}/metrics", headers=other_headers)).json() == []


async def test_endpoints_require_auth(client):
    for method, path in (
        ("get", "/sessions"), ("post", "/sessions"), ("get", "/journals"), ("post", "/journals"),
        ("get", "/metrics"), ("post", "/metrics"), ("get", "/goals"), ("get", "/export/checkins.csv"),
        ("post", "/uploads/avatar"), ("get", "/analysis/recommendations"),
    ):
        assert (await getattr(client, method)(f"{API}{path}")).status_code == 401, path
