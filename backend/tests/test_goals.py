import pytest


@pytest.mark.asyncio
async def test_create_goal(client, auth_headers):
    resp = await client.post("/api/v1/goals", json={
        "life_area_id": 4,
        "title": "Get a SWE job",
        "priority": 1,
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Get a SWE job"
    assert data["status"] == "active"
    assert data["progress_pct"] == 0


@pytest.mark.asyncio
async def test_list_goals(client, auth_headers):
    await client.post("/api/v1/goals", json={"life_area_id": 1, "title": "Run 5K"}, headers=auth_headers)
    resp = await client.get("/api/v1/goals", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_update_goal(client, auth_headers):
    create = await client.post("/api/v1/goals", json={"life_area_id": 3, "title": "Learn Python"}, headers=auth_headers)
    goal_id = create.json()["id"]
    resp = await client.patch(f"/api/v1/goals/{goal_id}", json={"progress_pct": 50}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["progress_pct"] == 50


@pytest.mark.asyncio
async def test_add_milestone(client, auth_headers):
    create = await client.post("/api/v1/goals", json={"life_area_id": 2, "title": "Deep work habit"}, headers=auth_headers)
    goal_id = create.json()["id"]
    resp = await client.post(f"/api/v1/goals/{goal_id}/milestones", json={"title": "First week done"}, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["title"] == "First week done"
    assert resp.json()["is_completed"] is False


@pytest.mark.asyncio
async def test_complete_milestone(client, auth_headers):
    create = await client.post("/api/v1/goals", json={"life_area_id": 5, "title": "Lose 5kg"}, headers=auth_headers)
    goal_id = create.json()["id"]
    ms = await client.post(f"/api/v1/goals/{goal_id}/milestones", json={"title": "First 2kg"}, headers=auth_headers)
    ms_id = ms.json()["id"]
    resp = await client.post(f"/api/v1/goals/{goal_id}/milestones/{ms_id}/complete", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_completed"] is True


@pytest.mark.asyncio
async def test_delete_goal(client, auth_headers):
    create = await client.post("/api/v1/goals", json={"life_area_id": 6, "title": "Meditate daily"}, headers=auth_headers)
    goal_id = create.json()["id"]
    resp = await client.delete(f"/api/v1/goals/{goal_id}", headers=auth_headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_uncomplete_milestone_undoes_progress(client, auth_headers):
    goal = (await client.post("/api/v1/goals", json={"life_area_id": 4, "title": "Ship"}, headers=auth_headers)).json()
    ids = []
    for title in ("a", "b"):
        ms = await client.post(f"/api/v1/goals/{goal['id']}/milestones", json={"title": title}, headers=auth_headers)
        ids.append(ms.json()["id"])

    await client.post(f"/api/v1/goals/{goal['id']}/milestones/{ids[0]}/complete", headers=auth_headers)
    goals = (await client.get("/api/v1/goals", headers=auth_headers)).json()
    assert [g["progress_pct"] for g in goals if g["id"] == goal["id"]] == [50]

    resp = await client.post(f"/api/v1/goals/{goal['id']}/milestones/{ids[0]}/uncomplete", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_completed"] is False and resp.json()["completed_at"] is None
    goals = (await client.get("/api/v1/goals", headers=auth_headers)).json()
    assert [g["progress_pct"] for g in goals if g["id"] == goal["id"]] == [0]


@pytest.mark.asyncio
async def test_uncomplete_milestone_is_owner_only(client, auth_headers):
    goal = (await client.post("/api/v1/goals", json={"life_area_id": 4, "title": "Ship"}, headers=auth_headers)).json()
    ms = (await client.post(f"/api/v1/goals/{goal['id']}/milestones", json={"title": "a"}, headers=auth_headers)).json()
    other = await client.post(
        "/api/v1/auth/register", json={"email": "g2@example.com", "password": "Test1234!", "full_name": "G2"}
    )
    headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    resp = await client.post(f"/api/v1/goals/{goal['id']}/milestones/{ms['id']}/uncomplete", headers=headers)
    assert resp.status_code == 404
