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
            "platform": "ios",
        },
    )
    return res.json()["access_token"]

@pytest.mark.asyncio
async def test_vehicles_flow(client: AsyncClient):
    token = await get_auth_token(client, "+919876500001")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Society
    create_res = await client.post(
        "/api/v1/societies",
        headers=headers,
        json={
            "name": "Vehicle Society",
            "slug": "vehicle-society",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560102",
            "country": "IN",
        },
    )
    assert create_res.status_code == 201
    society = create_res.json()
    society_id = society["id"]

    # 2. Add Resident Member
    member_res = await client.post(
        f"/api/v1/societies/{society_id}/members",
        headers=headers,
        json={
            "phone": "+919876500001",
            "full_name": "Test Resident",
            "unit_id": None,
            "role_code": "resident",
            "membership_type": "owner",
            "is_primary": True,
        },
    )
    assert member_res.status_code == 201

    # 3. Register Vehicle
    veh_res = await client.post(
        f"/api/v1/societies/{society_id}/vehicles",
        headers=headers,
        json={
            "registration_number": "KA01AB1234",
            "vehicle_type": "car",
            "make": "Honda",
            "model": "City",
            "parking_slot": "P-101",
        },
    )
    assert veh_res.status_code == 201
    vehicle = veh_res.json()
    assert vehicle["registration_number"] == "KA01AB1234"
    assert vehicle["vehicle_type"] == "car"
    assert vehicle["make"] == "Honda"
    veh_id = vehicle["id"]

    # 4. List Vehicles
    list_res = await client.get(
        f"/api/v1/societies/{society_id}/vehicles",
        headers=headers,
    )
    assert list_res.status_code == 200
    vehicles = list_res.json()
    assert len(vehicles) >= 1
    assert any(v["id"] == veh_id for v in vehicles)

    # 5. Delete Vehicle
    del_res = await client.delete(
        f"/api/v1/societies/{society_id}/vehicles/{veh_id}",
        headers=headers,
    )
    assert del_res.status_code == 204
