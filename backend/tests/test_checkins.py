import pytest
from datetime import date


@pytest.mark.asyncio
async def test_get_or_create_today(client, auth_headers):
    resp = await client.get("/api/v1/checkins/today", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["checkin_date"] == date.today().isoformat()
    assert data["is_complete"] is False


@pytest.mark.asyncio
async def test_update_checkin_scores(client, auth_headers):
    today_resp = await client.get("/api/v1/checkins/today", headers=auth_headers)
    checkin_id = today_resp.json()["id"]
    resp = await client.patch(f"/api/v1/checkins/{checkin_id}", json={
        "score_health": 9,
        "score_mind": 7,
        "score_relationships": 5,
        "score_work": 7,
        "score_money": 6,
        "score_growth": 6,
        "mood": 4,
        "energy": 4,
        "wins": ["Finished a chapter"],
        "blockers": [],
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["score_work"] == 7


@pytest.mark.asyncio
async def test_complete_checkin(client, auth_headers):
    today_resp = await client.get("/api/v1/checkins/today", headers=auth_headers)
    checkin_id = today_resp.json()["id"]
    # Update with required scores first
    await client.patch(f"/api/v1/checkins/{checkin_id}", json={
        "score_health": 7, "score_mind": 7, "score_relationships": 7,
        "score_work": 7, "score_money": 7, "score_growth": 7,
    }, headers=auth_headers)
    resp = await client.post(f"/api/v1/checkins/{checkin_id}/complete", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_complete"] is True


@pytest.mark.asyncio
async def test_checkin_trend(client, auth_headers):
    resp = await client.get("/api/v1/checkins/trend", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["points"]) == 30
    assert len(body["moving_avg_7"]) == 30


@pytest.mark.asyncio
async def test_checkin_unauthenticated(client):
    resp = await client.get("/api/v1/checkins/today")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_life_score_is_mean_of_rated_areas(client, auth_headers):
    today = await client.get("/api/v1/checkins/today", headers=auth_headers)
    resp = await client.patch(f"/api/v1/checkins/{today.json()['id']}", json={
        "score_health": 8, "score_mind": 6, "score_work": 7,
    }, headers=auth_headers)
    assert resp.json()["overall_score"] == 7.0


@pytest.mark.asyncio
async def test_old_area_fields_are_not_accepted(client, auth_headers):
    today = await client.get("/api/v1/checkins/today", headers=auth_headers)
    resp = await client.patch(f"/api/v1/checkins/{today.json()['id']}", json={"score_discipline": 7}, headers=auth_headers)
    assert "score_discipline" not in resp.json()


@pytest.mark.asyncio
@pytest.mark.parametrize("field", ["mood", "energy"])
async def test_mood_and_energy_are_rated_1_to_10(client, auth_headers, field):
    today = await client.get("/api/v1/checkins/today", headers=auth_headers)
    url = f"/api/v1/checkins/{today.json()['id']}"
    ok = await client.patch(url, json={field: 10}, headers=auth_headers)
    assert ok.status_code == 200 and ok.json()[field] == 10
    for bad in (0, 11):
        resp = await client.patch(url, json={field: bad}, headers=auth_headers)
        assert resp.status_code == 422, (field, bad)
    created = await client.post("/api/v1/checkins", json={"checkin_date": "2026-01-02", field: 11}, headers=auth_headers)
    assert created.status_code == 422
