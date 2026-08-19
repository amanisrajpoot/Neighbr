import pytest
from httpx import AsyncClient

async def get_auth_token(client: AsyncClient, phone: str = "+919876543210") -> str:
    await client.post("/api/v1/auth/otp/request", json={"phone": phone})
    res = await client.post(
        "/api/v1/auth/otp/verify",
        json={
            "phone": phone,
            "otp": "123456",
            "device_id": f"device-{phone}",
            "platform": "android",
        },
    )
    return res.json()["access_token"]

@pytest.mark.asyncio
async def test_gate_and_guard_lifecycle(client: AsyncClient):
    admin_token = await get_auth_token(client, "+919876511111")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create Society
    soc_res = await client.post(
        "/api/v1/societies",
        headers=headers,
        json={
            "name": "Prestige Tech Park Society",
            "slug": "prestige-tech-park",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560087",
        },
    )
    assert soc_res.status_code == 201
    soc_id = soc_res.json()["id"]

    # 2. Create Main Gate
    gate_res = await client.post(
        f"/api/v1/societies/{soc_id}/gates",
        headers=headers,
        json={"name": "Main North Gate", "code": "GATE-1", "gate_type": "entry_exit"},
    )
    assert gate_res.status_code == 201
    gate = gate_res.json()
    assert gate["name"] == "Main North Gate"
    gate_id = gate["id"]

    # 3. Create Guard Shift
    shift_res = await client.post(
        f"/api/v1/societies/{soc_id}/guard-shifts",
        headers=headers,
        json={"name": "Morning Shift", "start_time": "06:00:00", "end_time": "14:00:00"},
    )
    assert shift_res.status_code == 201
    shift_id = shift_res.json()["id"]

    # 4. Register Guard Profile
    guard_res = await client.post(
        f"/api/v1/societies/{soc_id}/guards",
        headers=headers,
        json={
            "phone": "+919876522222",
            "full_name": "Ramesh Kumar (Guard)",
            "employee_id": "SEC-001",
            "id_proof_type": "aadhaar",
            "id_proof_number": "1234-5678-9012",
        },
    )
    assert guard_res.status_code == 201
    guard = guard_res.json()
    guard_id = guard["id"]

    # 5. Assign Guard to Gate and Shift
    assign_res = await client.post(
        f"/api/v1/societies/{soc_id}/guards/{guard_id}/assign",
        headers=headers,
        json={"gate_id": gate_id, "shift_id": shift_id},
    )
    assert assign_res.status_code == 201
    assignment = assign_res.json()
    assert assignment["guard_id"] == guard_id
    assert assignment["gate_id"] == gate_id

    # 6. Guard Duty Check-in
    guard_token = await get_auth_token(client, "+919876522222")
    guard_headers = {"Authorization": f"Bearer {guard_token}"}

    checkin_res = await client.post(
        f"/api/v1/societies/{soc_id}/guards/{guard_id}/duty/check-in",
        headers=guard_headers,
        json={"gate_id": gate_id, "location": {"lat": 12.9716, "lng": 77.5946}},
    )
    assert checkin_res.status_code == 200
    assert checkin_res.json()["status"] == "on_duty"

    # 7. Guard Duty Check-out
    checkout_res = await client.post(
        f"/api/v1/societies/{soc_id}/guards/{guard_id}/duty/check-out",
        headers=guard_headers,
        json={"location": {"lat": 12.9716, "lng": 77.5946}},
    )
    assert checkout_res.status_code == 200
    assert checkout_res.json()["status"] == "off_duty"
