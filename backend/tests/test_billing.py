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
async def test_billing_flow(client: AsyncClient):
    token = await get_auth_token(client, "+919876500001")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Society
    create_res = await client.post(
        "/api/v1/societies",
        headers=headers,
        json={
            "name": "Billing Society",
            "slug": "billing-society",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560102",
            "country": "IN",
        },
    )
    assert create_res.status_code == 201
    society = create_res.json()
    society_id = society["id"]

    # 2. Add Building, Floor, Unit
    b_res = await client.post(
        f"/api/v1/societies/{society_id}/buildings",
        headers=headers,
        json={"name": "A", "code": "A", "total_floors": 1}
    )
    b_id = b_res.json()["id"]

    u_res = await client.post(
        f"/api/v1/societies/{society_id}/units/bulk",
        headers=headers,
        json={
            "building_id": b_id,
            "units": [{"unit_number": "101", "floor_number": 1, "unit_type": "apartment"}]
        }
    )
    unit_id = u_res.json()[0]["id"]

    # 3. Add Resident Member
    member_res = await client.post(
        f"/api/v1/societies/{society_id}/members",
        headers=headers,
        json={
            "phone": "+919876500001",
            "full_name": "Test Resident",
            "unit_id": unit_id,
            "role_code": "resident",
            "membership_type": "owner",
            "is_primary": True,
        },
    )
    assert member_res.status_code == 201

    # 4. Generate Batch Invoices
    inv_res = await client.post(
        f"/api/v1/societies/{society_id}/billing/invoices/generate-batch",
        headers=headers,
        json={
            "billing_period": "2026-09",
            "due_date": "2026-09-30",
            "base_maintenance": 2500,
            "sinking_fund": 500,
            "water_charges": 350
        }
    )
    assert inv_res.status_code == 201
    assert len(inv_res.json()) >= 1

    # 5. List Invoices
    list_res = await client.get(
        f"/api/v1/societies/{society_id}/billing/invoices",
        headers=headers,
    )
    assert list_res.status_code == 200
    invoices = list_res.json()
    assert len(invoices) >= 1
    inv_id = invoices[0]["id"]

    # 6. Pay Invoice
    pay_res = await client.post(
        f"/api/v1/societies/{society_id}/billing/invoices/{inv_id}/pay",
        headers=headers,
        json={
            "payment_method": "UPI",
            "amount": invoices[0]["total_amount"]
        }
    )
    assert pay_res.status_code == 201
    assert pay_res.json()["status"] == "SUCCESS"
