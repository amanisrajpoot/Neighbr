import uuid
import pytest
from httpx import AsyncClient
from app.core.events import event_bus, DomainEvent
from app.modules.audit.service import AuditService
from app.modules.audit.subscribers import register_audit_subscribers
from app.database import AsyncSessionLocal
from app.modules.auth.models import User
from app.modules.societies.models import Society
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_audit_event_persistence_and_api(client: AsyncClient):
    register_audit_subscribers()
    # 1. Setup society and admin user in DB
    society_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    async with AsyncSessionLocal() as db:
        society = Society(
            id=society_id,
            name="Audit Test Society",
            slug="audit-test-society",
            city="Bengaluru",
            state="Karnataka",
            pincode="560102",
        )
        db.add(society)

        admin_user = User(
            id=admin_id,
            phone="+919999988888",
            full_name="Audit Administrator",
            email="admin@audittest.com",
            is_active=True,
            phone_verified=True,
            is_platform_admin=True,
        )
        db.add(admin_user)
        await db.commit()

    # 2. Publish a DomainEvent through event_bus
    test_event = DomainEvent(
        society_id=str(society_id),
        actor_user_id=str(admin_id),
        event_type="VISITOR_PASS_APPROVED",
        entity_type="visitor_pass",
        entity_id="pass-12345",
        payload={"approved_by": "Audit Administrator", "unit_number": "A-101"},
        source="mobile_app",
    )
    await event_bus.publish(test_event)

    # 3. Verify event is persisted in DB via AuditService
    async with AsyncSessionLocal() as db:
        service = AuditService(db)
        events = await service.list_audit_events(society_id)
        assert len(events) >= 1
        saved = next(e for e in events if e.entity_id == "pass-12345")
        assert saved.event_type == "VISITOR_PASS_APPROVED"
        assert saved.source == "mobile_app"
        assert saved.payload["unit_number"] == "A-101"

    # 4. Verify admin API returns audit events
    token = create_access_token(
        data={
            "sub": str(admin_id),
            "phone": "+919999988888",
            "roles": ["society_admin"],
            "society_id": str(society_id),
        }
    )
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get(f"/api/v1/societies/{society_id}/audit/events", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    api_event = next(e for e in data if e.get("entity_id") == "pass-12345")
    assert api_event["event_type"] == "VISITOR_PASS_APPROVED"
    assert api_event["entity_type"] == "visitor_pass"
    assert api_event["actor"]["full_name"] == "Audit Administrator"
