import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient

async def get_auth_token(client: AsyncClient, phone: str) -> str:
    await client.post("/api/v1/auth/otp/request", json={"phone": phone})
    res = await client.post(
        "/api/v1/auth/otp/verify",
        json={
            "phone": phone,
            "otp": "123456",
            "device_id": f"device-{phone}",
            "platform": "ios",
        },
    )
    return res.json()["access_token"]

@pytest.mark.asyncio
async def test_full_visitor_lifecycle(client: AsyncClient):
    # 1. Admin creates Society, Gate, Building, Unit
    admin_token = await get_auth_token(client, "+919876530001")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    soc_res = await client.post(
        "/api/v1/societies",
        headers=admin_headers,
        json={
            "name": "Palm Meadows Villa Society",
            "slug": "palm-meadows",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560066",
        },
    )
    soc_id = soc_res.json()["id"]

    gate_res = await client.post(
        f"/api/v1/societies/{soc_id}/gates",
        headers=admin_headers,
        json={"name": "Gate 1", "code": "G1"},
    )
    gate_id = gate_res.json()["id"]

    bldg_res = await client.post(
        f"/api/v1/societies/{soc_id}/buildings",
        headers=admin_headers,
        json={"name": "Phase 1"},
    )
    bldg_id = bldg_res.json()["id"]

    unit_res = await client.post(
        f"/api/v1/societies/{soc_id}/units",
        headers=admin_headers,
        json={"building_id": bldg_id, "unit_number": "Villa-42"},
    )
    unit_id = unit_res.json()["id"]

    # 2. Add Resident Member
    resident_phone = "+919876530002"
    await client.post(
        f"/api/v1/societies/{soc_id}/members",
        headers=admin_headers,
        json={
            "phone": resident_phone,
            "full_name": "Siddharth Verma",
            "unit_id": unit_id,
            "role_code": "resident",
        },
    )

    resident_token = await get_auth_token(client, resident_phone)
    resident_headers = {"Authorization": f"Bearer {resident_token}"}

    # 3. Resident creates a Visitor Pass for Guest
    now = datetime.now(timezone.utc)
    pass_res = await client.post(
        f"/api/v1/societies/{soc_id}/visitors/passes",
        headers=resident_headers,
        json={
            "unit_id": unit_id,
            "pass_type": "guest",
            "visitor_name": "Ananya Roy",
            "visitor_phone": "+919876530099",
            "purpose": "Dinner visit",
            "vehicle_number": "KA01AB1234",
            "valid_from": (now - timedelta(hours=1)).isoformat(),
            "valid_until": (now + timedelta(hours=6)).isoformat(),
        },
    )
    assert pass_res.status_code == 201
    pass_data = pass_res.json()
    pass_id = pass_data["id"]
    qr_token = pass_data["qr_token"]
    assert pass_data["status"] == "APPROVED"

    # 4. Guard scans QR Pass
    guard_token = await get_auth_token(client, "+919876530003")
    # Register guard in society
    await client.post(
        f"/api/v1/societies/{soc_id}/guards",
        headers=admin_headers,
        json={"phone": "+919876530003", "full_name": "Guard Jagdish"},
    )
    guard_headers = {"Authorization": f"Bearer {guard_token}"}

    scan_res = await client.post(
        f"/api/v1/societies/{soc_id}/gates/{gate_id}/scan",
        headers=guard_headers,
        json={"qr_token": qr_token},
    )
    assert scan_res.status_code == 200
    assert scan_res.json()["visitor_name"] == "Ananya Roy"

    # 5. Guard Check-in (with idempotency key)
    checkin_key = "idempotent-key-checkin-001"
    checkin_res = await client.post(
        f"/api/v1/societies/{soc_id}/gates/{gate_id}/check-in",
        headers=guard_headers,
        json={
            "pass_id": pass_id,
            "qr_token": qr_token,
            "idempotency_key": checkin_key,
        },
    )
    assert checkin_res.status_code == 200
    assert checkin_res.json()["event_type"] == "CHECKED_IN"

    # Verify idempotency: duplicate check-in with same key returns identical event without error
    dup_res = await client.post(
        f"/api/v1/societies/{soc_id}/gates/{gate_id}/check-in",
        headers=guard_headers,
        json={
            "pass_id": pass_id,
            "qr_token": qr_token,
            "idempotency_key": checkin_key,
        },
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["id"] == checkin_res.json()["id"]

    # 6. Check Inside Visitors
    inside_res = await client.get(
        f"/api/v1/societies/{soc_id}/visitors/inside",
        headers=guard_headers,
    )
    assert inside_res.status_code == 200
    inside_list = inside_res.json()
    assert len(inside_list) == 1
    assert inside_list[0]["visitor_name"] == "Ananya Roy"

    # 7. Guard Check-out
    checkout_res = await client.post(
        f"/api/v1/societies/{soc_id}/gates/{gate_id}/check-out",
        headers=guard_headers,
        json={
            "pass_id": pass_id,
            "idempotency_key": "idempotent-key-checkout-001",
        },
    )
    assert checkout_res.status_code == 200
    assert checkout_res.json()["event_type"] == "CHECKED_OUT"

    # 8. Verify Inside list is now empty
    inside_after = await client.get(
        f"/api/v1/societies/{soc_id}/visitors/inside",
        headers=guard_headers,
    )
    assert inside_after.status_code == 200
    assert len(inside_after.json()) == 0
