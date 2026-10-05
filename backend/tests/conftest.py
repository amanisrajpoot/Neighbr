import os
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

import app.database as app_db
from app.main import app as fastapi_app
from app.database import Base, get_db

import app.modules.auth.models
import app.modules.societies.models
import app.modules.gates.models
import app.modules.visitors.models
import app.modules.notifications.models
import app.modules.staff.models
import app.modules.vehicles.models
import app.modules.notices.models
import app.modules.audit.models
import app.modules.helpdesk.models
import app.modules.amenities.models
import app.modules.billing.models
import app.modules.community.models
import app.modules.marketplace.models
import app.modules.iot.models
import app.modules.automations.models

app = fastapi_app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

app_db.engine = test_engine
app_db.AsyncSessionLocal = TestingSessionLocal

async def override_get_db():
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

fastapi_app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
        yield c
