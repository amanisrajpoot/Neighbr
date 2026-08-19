import pytest
from datetime import datetime, timezone
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
async def test_full_platform_operations(client: AsyncClient):
    # 1. Admin creates Society
    admin_token = await get_auth_token(client, "+919876540001")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    soc_res = await client.post(
        "/api/v1/societies",
        headers=admin_headers,
        json={
            "name": "Eldorado Royal Meadows",
            "slug": "eldorado-royal",
            "city": "Hyderabad",
            "state": "Telangana",
            "pincode": "500081",
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
        json={"name": "Block B"},
    )
    bldg_id = bldg_res.json()["id"]

    unit_res = await client.post(
        f"/api/v1/societies/{soc_id}/units",
        headers=admin_headers,
        json={"building_id": bldg_id, "unit_number": "B-302"},
    )
    unit_id = unit_res.json()["id"]

    # 2. Resident member setup
    res_phone = "+919876540002"
    await client.post(
        f"/api/v1/societies/{soc_id}/members",
        headers=admin_headers,
        json={"phone": res_phone, "full_name": "Vikram Sethi", "unit_id": unit_id, "role_code": "resident"},
    )
    res_token = await get_auth_token(client, res_phone)
    res_headers = {"Authorization": f"Bearer {res_token}"}

    # 3. Offline Batch Sync (Milestone 5)
    guard_phone = "+919876540003"
    await client.post(
        f"/api/v1/societies/{soc_id}/guards",
        headers=admin_headers,
        json={"phone": guard_phone, "full_name": "Guard Bheem"},
    )
    guard_token = await get_auth_token(client, guard_phone)
    guard_headers = {"Authorization": f"Bearer {guard_token}"}

    sync_res = await client.post(
        "/api/v1/sync/batch",
        headers=guard_headers,
        json={
            "society_id": soc_id,
            "device_id": "guard-device-007",
            "gate_id": gate_id,
            "operations": [
                {
                    "operation_id": "op-offline-001",
                    "operation_type": "walk_in",
                    "entity_type": "visitor_event",
                    "idempotency_key": "idem-offline-walkin-001",
                    "local_created_at": datetime.now(timezone.utc).isoformat(),
                    "payload": {
                        "visitor_name": "Amazon Delivery Agent",
                        "unit_id": unit_id,
                        "gate_id": gate_id,
                    },
                }
            ],
        },
    )
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["synced_count"] == 1
    assert sync_data["results"][0]["status"] == "SYNCED"

    # 4. Notifications Engine (Milestone 6)
    notifs_res = await client.get("/api/v1/notifications", headers=res_headers)
    assert notifs_res.status_code == 200

    unread_res = await client.get("/api/v1/notifications/unread-count", headers=res_headers)
    assert unread_res.status_code == 200

    # 5. Staff & Domestic Help (Milestone 7)
    staff_res = await client.post(
        f"/api/v1/societies/{soc_id}/staff",
        headers=admin_headers,
        json={"name": "Laxmi Bai", "phone": "+919876540099", "staff_type": "maid"},
    )
    assert staff_res.status_code == 201
    staff_id = staff_res.json()["id"]

    assign_res = await client.post(
        f"/api/v1/societies/{soc_id}/staff/{staff_id}/assign",
        headers=res_headers,
        json={"unit_id": unit_id, "schedule": {"days": ["Mon", "Wed", "Fri"]}},
    )
    assert assign_res.status_code == 201

    staff_checkin_res = await client.post(
        f"/api/v1/societies/{soc_id}/staff/{staff_id}/check-in",
        headers=guard_headers,
        json={"gate_id": gate_id, "unit_id": unit_id, "idempotency_key": "staff-checkin-001"},
    )
    assert staff_checkin_res.status_code == 200

    # 6. Vehicles Engine (Milestone 8)
    veh_res = await client.post(
        f"/api/v1/societies/{soc_id}/vehicles",
        headers=res_headers,
        json={
            "unit_id": unit_id,
            "registration_number": "TS09EA9999",
            "vehicle_type": "car",
            "make": "Hyundai",
            "model": "Creta",
            "parking_slot": "B-302-P1",
        },
    )
    assert veh_res.status_code == 201
    assert veh_res.json()["registration_number"] == "TS09EA9999"

    # 7. Notices & SOS (Milestone 9)
    notice_res = await client.post(
        f"/api/v1/societies/{soc_id}/notices",
        headers=admin_headers,
        json={
            "title": "Water Tank Cleaning Notice",
            "body": "Water supply will be paused from 2 PM to 5 PM this Sunday.",
            "priority": "high",
            "category": "maintenance",
        },
    )
    assert notice_res.status_code == 201

    sos_res = await client.post(
        f"/api/v1/societies/{soc_id}/sos",
        headers=res_headers,
        json={"unit_id": unit_id, "sos_type": "medical", "message": "Elderly patient needs wheelchair assistance"},
    )
    assert sos_res.status_code == 201
    sos_id = sos_res.json()["id"]

    resolve_res = await client.post(
        f"/api/v1/societies/{soc_id}/sos/{sos_id}/resolve",
        headers=guard_headers,
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "resolved"

    # 8. Operational Dashboard Statistics (Milestone 10)
    stats_res = await client.get(
        f"/api/v1/societies/{soc_id}/dashboard/stats",
        headers=admin_headers,
    )
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_units"] == 1
    assert stats["occupied_units"] == 1
    assert stats["total_staff_count"] == 1
    assert stats["active_notices_count"] == 1
