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
async def test_cashfree_order_generation_and_webhook(client: AsyncClient):
    token = await get_auth_token(client, "+919876599001")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Society
    soc_res = await client.post(
        "/api/v1/societies",
        headers=headers,
        json={
            "name": "Cashfree Society",
            "slug": "cashfree-soc",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560100",
            "country": "IN",
        },
    )
    assert soc_res.status_code == 201
    society_id = soc_res.json()["id"]

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
            "units": [{"unit_number": "CF-101", "floor_number": 1, "unit_type": "apartment"}]
        }
    )
    unit_id = u_res.json()[0]["id"]

    # 3. Add Resident
    await client.post(
        f"/api/v1/societies/{society_id}/members",
        headers=headers,
        json={
            "phone": "+919876599001",
            "full_name": "Cashfree Resident",
            "unit_id": unit_id,
            "role_code": "resident",
            "membership_type": "owner",
            "is_primary": True,
        },
    )

    # 4. Generate Invoices
    inv_batch = await client.post(
        f"/api/v1/societies/{society_id}/billing/invoices/generate-batch",
        headers=headers,
        json={
            "billing_period": "2026-10",
            "due_date": "2026-10-31",
            "base_maintenance": 3000,
            "sinking_fund": 500,
            "water_charges": 500,
        }
    )
    assert inv_batch.status_code == 201
    invoices = inv_batch.json()
    assert len(invoices) >= 1
    invoice = invoices[0]
    invoice_id = invoice["id"]
    expected_total = float(invoice["total_amount"])
    assert expected_total > 0

    # 5. Initiate Payment Session (Cashfree Order Creation)
    init_res = await client.post(
        f"/api/v1/societies/{society_id}/billing/invoices/{invoice_id}/initiate-payment",
        headers=headers,
        json={"return_url": "https://neighbr.app/pay/return"}
    )
    assert init_res.status_code == 200
    pay_data = init_res.json()
    assert pay_data["invoice_id"] == invoice_id
    assert pay_data["order_id"].startswith("CF-ORD-")
    assert "payment_session_id" in pay_data
    assert pay_data["order_amount"] == expected_total
    order_id = pay_data["order_id"]

    # 6. Verify invoice reflects the Cashfree order
    get_inv = await client.get(
        f"/api/v1/societies/{society_id}/billing/invoices/{invoice_id}",
        headers=headers,
    )
    assert get_inv.status_code == 200
    assert get_inv.json()["cashfree_order_id"] == order_id
    assert get_inv.json()["status"] == "UNPAID"

    # 7. Cashfree Webhook callback simulating successful payment
    webhook_payload = {
        "type": "PAYMENT_SUCCESS_WEBHOOK",
        "event_time": "2026-10-05T12:00:00Z",
        "data": {
            "order": {
                "order_id": order_id,
                "order_amount": expected_total,
                "order_currency": "INR",
            },
            "payment": {
                "cf_payment_id": "cf_pay_99887766",
                "payment_status": "SUCCESS",
                "payment_amount": expected_total,
                "payment_currency": "INR",
                "payment_group": "UPI",
            }
        }
    }

    wh_res = await client.post(
        "/api/v1/billing/webhook/cashfree",
        json=webhook_payload,
        headers={"x-webhook-signature": "test_sig", "x-webhook-timestamp": "1728120000"}
    )
    assert wh_res.status_code == 200
    assert wh_res.json() == {"status": "ok"}

    # 8. Verify Invoice is now marked PAID with transactions recorded
    settled_inv = await client.get(
        f"/api/v1/societies/{society_id}/billing/invoices/{invoice_id}",
        headers=headers,
    )
    assert settled_inv.status_code == 200
    settled_data = settled_inv.json()
    assert settled_data["status"] == "PAID"
    assert settled_data["paid_amount"] == expected_total
    assert settled_data["paid_at"] is not None
    assert len(settled_data["transactions"]) >= 1
    txn = settled_data["transactions"][0]
    assert txn["amount"] == expected_total
    assert txn["payment_method"] == "UPI"
    assert txn["status"] == "SUCCESS"
    assert txn["receipt_number"].startswith("REC-")
