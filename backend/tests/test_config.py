import pytest
from pydantic import ValidationError

from app.core.config import Settings

DB = "postgresql+asyncpg://u:p@localhost/db"


def make(**kw):
    return Settings(_env_file=None, DATABASE_URL=DB, **kw)


@pytest.mark.parametrize(
    "key",
    ["change-me-use-openssl-rand-hex-32", "local-dev-secret-change-me-0123456789abcdef", "short"],
)
def test_production_refuses_placeholder_or_short_secret_key(key):
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        make(ENVIRONMENT="production", SECRET_KEY=key)


def test_production_accepts_a_real_key():
    assert make(ENVIRONMENT="production", SECRET_KEY="a3f1" * 16).ENVIRONMENT == "production"


def test_development_allows_a_placeholder_key():
    assert make(ENVIRONMENT="development", SECRET_KEY="change-me").SECRET_KEY == "change-me"
