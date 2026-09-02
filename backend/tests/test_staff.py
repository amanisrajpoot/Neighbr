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
async def test_staff_flow(client: AsyncClient):
    token = await get_auth_token(client, "+919876500001")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Society
    create_res = await client.post(
        "/api/v1/societies",
        headers=headers,
        json={
            "name": "Staff Society",
            "slug": "staff-society",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560102",
            "country": "IN",
        },
    )
    assert create_res.status_code == 201
    society = create_res.json()
    society_id = society["id"]

    # 2. Register Staff
    staff_res = await client.post(
        f"/api/v1/societies/{society_id}/staff",
        headers=headers,
        json={
            "name": "Kamala",
            "phone": "+919999999999",
            "staff_type": "maid"
        },
    )
    assert staff_res.status_code == 201
    staff_member = staff_res.json()
    assert staff_member["name"] == "Kamala"
    assert staff_member["staff_type"] == "maid"
    staff_id = staff_member["id"]

    # 3. List Staff
    list_res = await client.get(
        f"/api/v1/societies/{society_id}/staff",
        headers=headers,
    )
    assert list_res.status_code == 200
    staff_list = list_res.json()
    assert len(staff_list) >= 1
    assert any(s["id"] == staff_id for s in staff_list)

    # 4. Check In Staff
    check_in_res = await client.post(
        f"/api/v1/societies/{society_id}/staff/{staff_id}/check-in",
        headers=headers,
        json={
            "idempotency_key": "chk-1234"
        }
    )
    assert check_in_res.status_code == 200

    # 5. Check Out Staff
    check_out_res = await client.post(
        f"/api/v1/societies/{society_id}/staff/{staff_id}/check-out",
        headers=headers,
        json={
            "idempotency_key": "chk-out-1234"
        }
    )
    assert check_out_res.status_code == 200
