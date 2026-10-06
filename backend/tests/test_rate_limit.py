import pytest

from app.core.limiter import limiter


@pytest.fixture
def rate_limiting_on():
    limiter.reset()
    limiter.enabled = True
    yield
    limiter.enabled = False
    limiter.reset()


@pytest.mark.asyncio
async def test_login_is_rate_limited(client, rate_limiting_on):
    body = {"email": "nobody@example.com", "password": "wrong-password"}
    codes = [(await client.post("/api/v1/auth/login", json=body)).status_code for _ in range(12)]
    assert 429 in codes
    assert codes[0] == 401  # normal failures come first, throttling kicks in later


@pytest.mark.asyncio
async def test_default_limit_covers_plain_routes(client, rate_limiting_on):
    codes = [(await client.get("/health")).status_code for _ in range(105)]
    assert codes.count(429) >= 1
