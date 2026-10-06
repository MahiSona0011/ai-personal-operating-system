import pytest


@pytest.mark.asyncio
async def test_dashboard_loads(client, auth_headers):
    resp = await client.get("/api/v1/dashboard", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert set(data) == {
        "user", "today", "life_area_scores", "days", "selected_areas", "life_score", "life_score_delta",
        "checkin_streak", "checkin_consistency_30", "areas", "highlights", "latest_insight",
    }
    assert data["today"]["habits_summary"]["total"] == 0


@pytest.mark.asyncio
async def test_dashboard_requires_auth(client):
    resp = await client.get("/api/v1/dashboard")
    assert resp.status_code == 401
