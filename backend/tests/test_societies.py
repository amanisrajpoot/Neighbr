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
async def test_create_and_manage_society(client: AsyncClient):
    token = await get_auth_token(client, "+919876500001")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Society
    create_res = await client.post(
        "/api/v1/societies",
        headers=headers,
        json={
            "name": "Greenwood Palms Heights",
            "slug": "greenwood-palms",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560102",
            "country": "IN",
        },
    )
    assert create_res.status_code == 201
    society = create_res.json()
    society_id = society["id"]
    assert society["name"] == "Greenwood Palms Heights"

    # 2. Get Society Settings
    settings_res = await client.get(f"/api/v1/societies/{society_id}/settings", headers=headers)
    assert settings_res.status_code == 200
    assert settings_res.json()["visitor_approval_required"] is True

    # 3. Create Building
    bldg_res = await client.post(
        f"/api/v1/societies/{society_id}/buildings",
        headers=headers,
        json={"name": "Tower A", "code": "TWR-A", "total_floors": 10},
    )
    assert bldg_res.status_code == 201
    bldg_id = bldg_res.json()["id"]

    # 4. Create Floor
    floor_res = await client.post(
        f"/api/v1/societies/{society_id}/buildings/{bldg_id}/floors",
        headers=headers,
        json={"name": "1st Floor", "floor_number": 1},
    )
    assert floor_res.status_code == 201
    floor_id = floor_res.json()["id"]

    # 5. Bulk Create Units
    bulk_res = await client.post(
        f"/api/v1/societies/{society_id}/units/bulk",
        headers=headers,
        json={
            "building_id": bldg_id,
            "units": [
                {"unit_number": "101", "floor_number": 1, "unit_type": "apartment"},
                {"unit_number": "102", "floor_number": 1, "unit_type": "apartment"},
            ],
        },
    )
    assert bulk_res.status_code == 201
    units = bulk_res.json()
    assert len(units) == 2
    unit_101_id = units[0]["id"]

    # 6. Add Resident Member
    member_res = await client.post(
        f"/api/v1/societies/{society_id}/members",
        headers=headers,
        json={
            "phone": "+919876599999",
            "full_name": "Rahul Sharma",
            "unit_id": unit_101_id,
            "role_code": "resident",
            "membership_type": "owner",
            "is_primary": True,
        },
    )
    assert member_res.status_code == 201
    membership_id = member_res.json()["id"]

    # 7. Add Family Member
    family_res = await client.post(
        f"/api/v1/societies/{society_id}/memberships/{membership_id}/family",
        headers=headers,
        json={
            "name": "Pooja Sharma",
            "phone": "+919876588888",
            "relation": "Spouse",
            "age_group": "adult",
        },
    )
    assert family_res.status_code == 201
    assert family_res.json()["name"] == "Pooja Sharma"

@pytest.mark.asyncio
async def test_tenant_isolation_unauthorized_access(client: AsyncClient):
    # Admin creates Society 1
    admin_token = await get_auth_token(client, "+919876500010")
    soc_res = await client.post(
        "/api/v1/societies",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Society One",
            "slug": "society-one",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
        },
    )
    soc_id = soc_res.json()["id"]

    # Random user (no membership) tries to read buildings
    other_token = await get_auth_token(client, "+919876500099")
    bad_res = await client.get(
        f"/api/v1/societies/{soc_id}/buildings",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert bad_res.status_code == 403
    assert bad_res.json()["error"]["code"] == "FORBIDDEN_SOCIETY_ACCESS"
