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
async def test_notices_flow(client: AsyncClient):
    token = await get_auth_token(client, "+919876500001")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Society
    create_res = await client.post(
        "/api/v1/societies",
        headers=headers,
        json={
            "name": "Notice Society",
            "slug": "notice-society",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560102",
            "country": "IN",
        },
    )
    assert create_res.status_code == 201
    society = create_res.json()
    society_id = society["id"]

    # 2. Publish Notice
    notice_res = await client.post(
        f"/api/v1/societies/{society_id}/notices",
        headers=headers,
        json={
            "title": "Water Shutdown",
            "body": "No water from 2 PM to 5 PM today.",
            "category": "maintenance"
        },
    )
    assert notice_res.status_code == 201
    notice = notice_res.json()
    assert notice["title"] == "Water Shutdown"
    assert notice["category"] == "maintenance"
    notice_id = notice["id"]

    # 3. List Notices
    list_res = await client.get(
        f"/api/v1/societies/{society_id}/notices",
        headers=headers,
    )
    assert list_res.status_code == 200
    notices = list_res.json()
    assert len(notices) >= 1
    assert any(n["id"] == notice_id for n in notices)

    # 4. Create Emergency Contact
    contact_res = await client.post(
        f"/api/v1/societies/{society_id}/emergency-contacts",
        headers=headers,
        json={
            "name": "Local Police",
            "phone": "100",
            "role": "police"
        }
    )
    assert contact_res.status_code == 201
    
    # 5. List Emergency Contacts
    list_contact_res = await client.get(
        f"/api/v1/societies/{society_id}/emergency-contacts",
        headers=headers,
    )
    assert list_contact_res.status_code == 200
    assert len(list_contact_res.json()) >= 1
