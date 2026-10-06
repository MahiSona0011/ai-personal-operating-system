import pytest
from datetime import date


@pytest.mark.asyncio
async def test_create_habit(client, auth_headers):
    resp = await client.post("/api/v1/habits", json={
        "life_area_id": 1,
        "title": "Read 20 minutes",
        "frequency": "daily",
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Read 20 minutes"
    assert data["current_streak"] == 0


@pytest.mark.asyncio
async def test_list_habits(client, auth_headers):
    await client.post("/api/v1/habits", json={"life_area_id": 1, "title": "Morning run"}, headers=auth_headers)
    resp = await client.get("/api/v1/habits", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_update_habit(client, auth_headers):
    create = await client.post("/api/v1/habits", json={"life_area_id": 2, "title": "Meditate"}, headers=auth_headers)
    habit_id = create.json()["id"]
    resp = await client.patch(f"/api/v1/habits/{habit_id}", json={"title": "Meditate 10 min"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Meditate 10 min"


@pytest.mark.asyncio
async def test_log_habit(client, auth_headers):
    create = await client.post("/api/v1/habits", json={"life_area_id": 3, "title": "Study"}, headers=auth_headers)
    habit_id = create.json()["id"]
    today = date.today().isoformat()
    resp = await client.post(f"/api/v1/habits/{habit_id}/log", json={"log_date": today}, headers=auth_headers)
    assert resp.status_code in (200, 201)


@pytest.mark.asyncio
async def test_delete_habit(client, auth_headers):
    create = await client.post("/api/v1/habits", json={"life_area_id": 4, "title": "Journal"}, headers=auth_headers)
    habit_id = create.json()["id"]
    resp = await client.delete(f"/api/v1/habits/{habit_id}", headers=auth_headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_habits_today(client, auth_headers):
    resp = await client.get("/api/v1/habits/today", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_create_habit_invalid_area(client, auth_headers):
    resp = await client.post("/api/v1/habits", json={"life_area_id": 999, "title": "Test"}, headers=auth_headers)
    assert resp.status_code in (400, 404, 422)


@pytest.mark.asyncio
async def test_unlog_habit_undoes_a_log_and_its_streak(client, auth_headers):
    habit = (await client.post("/api/v1/habits", json={"life_area_id": 1, "title": "Walk"}, headers=auth_headers)).json()
    today = date.today().isoformat()
    await client.post(f"/api/v1/habits/{habit['id']}/log", json={"log_date": today}, headers=auth_headers)
    assert (await client.get(f"/api/v1/habits/{habit['id']}/streak", headers=auth_headers)).json()["current_streak"] == 1

    resp = await client.delete(f"/api/v1/habits/{habit['id']}/log", params={"log_date": today}, headers=auth_headers)
    assert resp.status_code == 204
    streak = (await client.get(f"/api/v1/habits/{habit['id']}/streak", headers=auth_headers)).json()
    assert streak["current_streak"] == 0 and streak["total_completions"] == 0 and streak["last_completed_date"] is None
    today_list = (await client.get("/api/v1/habits/today", headers=auth_headers)).json()
    assert [h["completed_today"] for h in today_list if h["id"] == habit["id"]] == [False]


@pytest.mark.asyncio
async def test_unlog_is_idempotent_and_scoped_to_the_owner(client, auth_headers):
    habit = (await client.post("/api/v1/habits", json={"life_area_id": 1, "title": "Walk"}, headers=auth_headers)).json()
    today = date.today().isoformat()
    again = await client.delete(f"/api/v1/habits/{habit['id']}/log", params={"log_date": today}, headers=auth_headers)
    assert again.status_code == 204, "nothing to remove is not an error"

    other = await client.post(
        "/api/v1/auth/register", json={"email": "o@example.com", "password": "Test1234!", "full_name": "O"}
    )
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    await client.post(f"/api/v1/habits/{habit['id']}/log", json={"log_date": today}, headers=auth_headers)
    stolen = await client.delete(f"/api/v1/habits/{habit['id']}/log", params={"log_date": today}, headers=other_headers)
    assert stolen.status_code == 404
    assert (await client.get(f"/api/v1/habits/{habit['id']}/streak", headers=auth_headers)).json()["current_streak"] == 1
