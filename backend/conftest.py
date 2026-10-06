"""
Shared pytest fixtures for the Selfstack backend test suite.
Uses SQLite in-memory via aiosqlite — no PostgreSQL required for CI.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base, LifeArea
from app.core.areas import AREAS
from app.core.database import get_db
from app.main import app


TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
async def create_tables():
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Seed life areas
        async with _session_factory() as session:
            areas = [
                LifeArea(id=i, slug=slug, name=name, icon=icon, color_hex=color, sort_order=i)
                for i, slug, name, icon, color in AREAS
            ]
            session.add_all(areas)
            await session.commit()
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    async with _session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
def in_txn(db_session, monkeypatch):
    """For code that commits or rolls back itself: keep both inside the test's own transaction."""
    async def _noop():
        return None

    monkeypatch.setattr(db_session, "commit", db_session.flush)
    monkeypatch.setattr(db_session, "rollback", _noop)


@pytest.fixture
async def client(db_session, monkeypatch):
    """HTTP test client with DB dependency overridden.

    Endpoints that commit on purpose (e.g. refresh-token reuse) must not outlive the test, so a commit
    here only flushes; the db_session fixture rolls everything back at the end.
    """
    monkeypatch.setattr(db_session, "commit", db_session.flush)

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def registered_user(client):
    """Register a test user and return (user_data, tokens)."""
    payload = {"email": "test@example.com", "password": "Test1234!", "full_name": "Test User"}
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201
    tokens = resp.json()
    return payload, tokens


@pytest.fixture
async def other_headers(client, registered_user):
    """A second signed-in user, for tests that check one person can't see or change another's data."""
    resp = await client.post(
        "/api/v1/auth/register", json={"email": "other@example.com", "password": "Test1234!", "full_name": "Other User"}
    )
    assert resp.status_code == 201
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
async def auth_headers(registered_user):
    """Bearer token headers for the registered test user."""
    _, tokens = registered_user
    return {"Authorization": f"Bearer {tokens['access_token']}"}
