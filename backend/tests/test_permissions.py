import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.modules.auth.models import Role, Permission

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
async def test_require_permission_matrix(client: AsyncClient):
    admin_phone = "+919876540001"
    resident_phone = "+919876540002"
    outsider_phone = "+919876540003"

    admin_token = await get_auth_token(client, admin_phone)
    resident_token = await get_auth_token(client, resident_phone)
    outsider_token = await get_auth_token(client, outsider_phone)

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    resident_headers = {"Authorization": f"Bearer {resident_token}"}
    outsider_headers = {"Authorization": f"Bearer {outsider_token}"}

    # 1. Create Society with Admin
    soc_res = await client.post(
        "/api/v1/societies",
        headers=admin_headers,
        json={
            "name": "RBAC Perm Society",
            "slug": "rbac-perm-soc",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560100",
            "country": "IN",
        },
    )
    assert soc_res.status_code == 201
    society_id = soc_res.json()["id"]

    # 2. Add Building and Unit
    b_res = await client.post(
        f"/api/v1/societies/{society_id}/buildings",
        headers=admin_headers,
        json={"name": "Tower A", "code": "TA", "total_floors": 1}
    )
    building_id = b_res.json()["id"]

    u_res = await client.post(
        f"/api/v1/societies/{society_id}/units/bulk",
        headers=admin_headers,
        json={
            "building_id": building_id,
            "units": [{"unit_number": "101", "floor_number": 1, "unit_type": "apartment"}]
        }
    )
    unit_id = u_res.json()[0]["id"]

    # 3. Add Resident Member
    member_res = await client.post(
        f"/api/v1/societies/{society_id}/members",
        headers=admin_headers,
        json={
            "phone": resident_phone,
            "full_name": "Resident Perm User",
            "unit_id": unit_id,
            "role_code": "resident",
            "membership_type": "tenant",
            "is_primary": True,
        },
    )
    assert member_res.status_code == 201

    # 4. Outsider gets 403 FORBIDDEN_SOCIETY_ACCESS
    res_outsider = await client.get(
        f"/api/v1/societies/{society_id}/billing/ledger",
        headers=outsider_headers,
    )
    assert res_outsider.status_code == 403
    assert res_outsider.json()["error"]["code"] == "FORBIDDEN_SOCIETY_ACCESS"

    # 5. Resident without 'billing:manage' gets 403 INSUFFICIENT_PERMISSIONS
    res_resident = await client.get(
        f"/api/v1/societies/{society_id}/billing/ledger",
        headers=resident_headers,
    )
    assert res_resident.status_code == 403
    assert res_resident.json()["error"]["code"] == "INSUFFICIENT_PERMISSIONS"
    assert "billing:manage" in res_resident.json()["error"]["message"]

    # 6. Admin has permission by default (200 OK)
    res_admin = await client.get(
        f"/api/v1/societies/{society_id}/billing/ledger",
        headers=admin_headers,
    )
    assert res_admin.status_code == 200

    # 7. Dynamically attach 'billing:manage' permission to 'resident' role
    async with AsyncSessionLocal() as db:
        perm_res = await db.execute(select(Permission).where(Permission.code == "billing:manage"))
        perm = perm_res.scalars().first()
        if not perm:
            perm = Permission(code="billing:manage", module="billing", description="Manage Billing")
            db.add(perm)
            await db.flush()

        role_res = await db.execute(
            select(Role).where(Role.code == "resident").options(selectinload(Role.permissions))
        )
        role = role_res.scalars().first()
        assert role is not None
        role.permissions.append(perm)
        await db.commit()

    # 8. Now Resident user with granted permission gets 200 OK!
    res_resident_granted = await client.get(
        f"/api/v1/societies/{society_id}/billing/ledger",
        headers=resident_headers,
    )
    assert res_resident_granted.status_code == 200
    assert "total_billed" in res_resident_granted.json()
