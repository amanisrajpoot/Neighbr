import pytest
import uuid
from httpx import AsyncClient
from datetime import datetime, timezone, timedelta

pytestmark = pytest.mark.asyncio


async def test_complete_platform_lifecycle(client: AsyncClient):
    """
    End-to-End Integration Test covering the core lifecycle across all 11 phases.
    """
    # 1. Health check
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # 2. Auth Flow - Send OTP & Verify
    phone = "+919876543210"
    res = await client.post("/api/v1/auth/otp/send", json={"phone": phone})
    assert res.status_code == 200
    otp = res.json()["dev_otp"]
    assert otp is not None

    res = await client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": phone, "otp": otp, "platform": "web", "device_id": "dev-test-1"},
    )
    assert res.status_code == 200
    data = res.json()
    token = data["tokens"]["access_token"]
    user_id = data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Society
    soc_payload = {
        "name": "Palm Meadows Luxury Enclave",
        "slug": f"palm-meadows-{uuid.uuid4().hex[:6]}",
        "address_line1": "Whitefield Main Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560066",
        "total_units": 150,
    }
    res = await client.post("/api/v1/societies", json=soc_payload, headers=headers)
    assert res.status_code == 201
    soc_data = res.json()
    society_id = soc_data["id"]

    # 4. Create Building & Unit
    bld_res = await client.post(
        f"/api/v1/societies/{society_id}/buildings",
        json={"name": "Tower Amber", "total_floors": 12},
        headers=headers,
    )
    assert bld_res.status_code == 201
    building_id = bld_res.json()["id"]

    unit_res = await client.post(
        f"/api/v1/societies/{society_id}/units",
        json={"building_id": building_id, "unit_number": "A-101", "floor_number": 1},
        headers=headers,
    )
    assert unit_res.status_code == 201
    unit_id = unit_res.json()["id"]

    # Attach User as Resident
    mem_res = await client.post(
        f"/api/v1/societies/{society_id}/units/{unit_id}/memberships",
        json={"user_id": user_id, "role": "society_admin", "membership_type": "owner"},
        headers=headers,
    )
    assert mem_res.status_code == 201

    # 5. Gate & Sentry
    gate_res = await client.post(
        f"/api/v1/societies/{society_id}/gates",
        json={"name": "Main North Gate", "gate_type": "MAIN"},
        headers=headers,
    )
    assert gate_res.status_code == 201

    # 6. Pre-Approved Visitor Pass (Phase 2)
    pass_res = await client.post(
        f"/api/v1/societies/{society_id}/visitors/passes",
        json={
            "unit_id": unit_id,
            "visitor_name": "Rohan Gupta",
            "visitor_phone": "+91 9988776655",
            "visitor_type": "GUEST",
            "valid_from": datetime.now(timezone.utc).isoformat(),
            "valid_until": (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat(),
        },
        headers=headers,
    )
    assert pass_res.status_code == 201
    pass_code = pass_res.json()["pass_code"]
    assert pass_code.startswith("GST-")

    # 7. Helpdesk Maintenance Ticket (Phase 5)
    ticket_res = await client.post(
        f"/api/v1/societies/{society_id}/helpdesk/tickets",
        json={
            "title": "Master Bathroom Water Leakage",
            "description": "Slow water dripping from overhead valve.",
            "category": "plumbing",
            "priority": "high",
            "unit_id": unit_id,
        },
        headers=headers,
    )
    assert ticket_res.status_code == 201
    assert ticket_res.json()["status"] == "OPEN"

    # 8. Clubhouse Amenity Booking (Phase 6)
    amn_res = await client.get(f"/api/v1/societies/{society_id}/amenities", headers=headers)
    assert amn_res.status_code == 200
    amenities = amn_res.json()
    assert len(amenities) > 0
    pool_id = amenities[0]["id"]

    book_res = await client.post(
        f"/api/v1/societies/{society_id}/amenities/{pool_id}/book",
        json={
            "booking_date": datetime.now(timezone.utc).date().isoformat(),
            "start_time": "07:00 AM",
            "end_time": "08:00 AM",
            "guest_count": 2,
            "unit_id": unit_id,
        },
        headers=headers,
    )
    assert book_res.status_code == 201
    assert book_res.json()["qr_pass"].startswith("AMN-")

    # 9. Maintenance Billing Ledger (Phase 7)
    ledger_res = await client.get(f"/api/v1/societies/{society_id}/billing/ledger", headers=headers)
    assert ledger_res.status_code == 200
    assert "total_billed" in ledger_res.json()

    # 10. Community Forum Post & Poll (Phase 8)
    post_res = await client.post(
        f"/api/v1/societies/{society_id}/community/posts",
        json={
            "title": "Diwali Cultural Night & Rangoli Contest",
            "content": "Join us at the central amphitheatre this Saturday at 6 PM!",
            "category": "events",
        },
        headers=headers,
    )
    assert post_res.status_code == 201

    poll_res = await client.post(
        f"/api/v1/societies/{society_id}/community/polls",
        json={
            "question": "Should we install EV Fast Chargers in Basement 2?",
            "description": "Society proposal for 4 dual-gun 22kW charging points.",
            "options": ["Yes, highly needed", "No, unnecessary", "Need more details"],
        },
        headers=headers,
    )
    assert poll_res.status_code == 201
    assert poll_res.json()["total_votes"] == 0

    # 11. Resident Marketplace Listing & Vendor (Phase 9)
    item_res = await client.post(
        f"/api/v1/societies/{society_id}/marketplace/listings",
        json={
            "title": "Solid Oak Wood Bookshelf",
            "description": "6-shelf teak finish bookshelf, excellent condition.",
            "category": "furniture",
            "price": 3200,
            "is_free": False,
            "unit_id": unit_id,
        },
        headers=headers,
    )
    assert item_res.status_code == 201
    assert item_res.json()["status"] == "ACTIVE"

    # 12. IoT Gate Hardware & Smart Rules (Phase 10)
    devices_res = await client.get(f"/api/v1/societies/{society_id}/iot/devices", headers=headers)
    assert devices_res.status_code == 200
    devices = devices_res.json()
    assert len(devices) > 0
    barrier_id = devices[0]["id"]

    cmd_res = await client.post(
        f"/api/v1/societies/{society_id}/iot/devices/{barrier_id}/command",
        json={"command": "OPEN_BARRIER"},
        headers=headers,
    )
    assert cmd_res.status_code == 200
    assert cmd_res.json()["status"] == "SUCCESS"

    rule_res = await client.post(
        f"/api/v1/societies/{society_id}/automations/rules",
        json={
            "name": "Overstayed Contractor Auto-Alert",
            "trigger_event": "VISITOR_OVERSTAY",
            "action_type": "SEND_PUSH_NOTIFICATION",
            "conditions": {"cutoff_hour": 19},
            "action_payload": {"priority": "high"},
            "is_active": True,
        },
        headers=headers,
    )
    assert rule_res.status_code == 201

    # 13. AI Resident Assistant & Notice Copilot (Phase 11)
    chat_res = await client.post(
        f"/api/v1/societies/{society_id}/ai/chat",
        json={"message": "How do I book the tennis court?", "history": []},
        headers=headers,
    )
    assert chat_res.status_code == 200
    assert "Clubhouse" in chat_res.json()["reply"]

    notice_draft_res = await client.post(
        f"/api/v1/societies/{society_id}/ai/draft-notice",
        json={
            "topic": "Swimming Pool Chemical Chlorination",
            "bullet_points": ["Pool closed this Tuesday 8 AM - 4 PM", "Water filtration pumps will be replaced"],
            "tone": "formal",
        },
        headers=headers,
    )
    assert notice_draft_res.status_code == 200
    assert "Swimming Pool" in notice_draft_res.json()["title"]

    anom_res = await client.get(f"/api/v1/societies/{society_id}/ai/anomalies", headers=headers)
    assert anom_res.status_code == 200
    assert len(anom_res.json()) > 0
