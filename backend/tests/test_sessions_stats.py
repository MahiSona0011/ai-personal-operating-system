from datetime import datetime, timezone

import pytest

API = "/api/v1"


async def add_session(client, headers, *, area=4, kind="deep_work", minutes=60, quality=4):
    resp = await client.post(f"{API}/sessions", json={
        "life_area_id": area, "session_type": kind, "title": f"{kind} block",
        "started_at": datetime.now(timezone.utc).isoformat(), "duration_minutes": minutes, "quality_rating": quality,
    }, headers=headers)
    assert resp.status_code == 201, resp.text


@pytest.mark.asyncio
async def test_stats_can_be_filtered_by_type_and_area(client, auth_headers):
    await add_session(client, auth_headers, area=4, kind="deep_work", minutes=90, quality=5)
    await add_session(client, auth_headers, area=4, kind="meeting", minutes=30, quality=2)
    await add_session(client, auth_headers, area=6, kind="learning", minutes=45, quality=4)

    everything = (await client.get(f"{API}/sessions/stats", headers=auth_headers)).json()
    assert everything["total_minutes"] == 165 and everything["session_count"] == 3

    deep = (await client.get(f"{API}/sessions/stats", params={"session_type": "deep_work"}, headers=auth_headers)).json()
    assert deep["total_minutes"] == 90 and deep["session_count"] == 1 and deep["avg_quality"] == 5

    work = (await client.get(f"{API}/sessions/stats", params={"life_area_id": 4}, headers=auth_headers)).json()
    assert work["total_minutes"] == 120 and work["session_count"] == 2

    both = (await client.get(
        f"{API}/sessions/stats", params={"life_area_id": 6, "session_type": "deep_work"}, headers=auth_headers
    )).json()
    assert both["session_count"] == 0 and both["avg_quality"] is None


@pytest.mark.asyncio
async def test_stats_never_include_other_users(client, auth_headers):
    other = await client.post(
        f"{API}/auth/register", json={"email": "s2@example.com", "password": "Test1234!", "full_name": "S2"}
    )
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    await add_session(client, other_headers, minutes=100)
    mine = (await client.get(f"{API}/sessions/stats", headers=auth_headers)).json()
    assert mine["session_count"] == 0
