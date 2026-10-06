import pytest


REGISTER_PAYLOAD = {
    "email": "auth_test@example.com",
    "password": "Test1234!",
    "full_name": "Auth Tester",
}


@pytest.mark.asyncio
async def test_register_success(client):
    resp = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    resp = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_weak_password(client):
    resp = await client.post("/api/v1/auth/register", json={**REGISTER_PAYLOAD, "password": "weak"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    resp = await client.post("/api/v1/auth/login", json={
        "email": REGISTER_PAYLOAD["email"],
        "password": REGISTER_PAYLOAD["password"],
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    resp = await client.post("/api/v1/auth/login", json={
        "email": REGISTER_PAYLOAD["email"],
        "password": "WrongPass1!",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client, auth_headers):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["onboarding_state"] == "pending"


@pytest.mark.asyncio
async def test_update_me(client, auth_headers):
    resp = await client.patch("/api/v1/auth/me", json={"display_name": "Mahi"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Mahi"


@pytest.mark.asyncio
async def test_complete_onboarding(client, auth_headers):
    resp = await client.patch("/api/v1/auth/me/onboarding", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["onboarding_state"] == "complete"


@pytest.mark.asyncio
async def test_refresh_token(client, registered_user):
    _, tokens = registered_user
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_logout(client, registered_user):
    _, tokens = registered_user
    resp = await client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
