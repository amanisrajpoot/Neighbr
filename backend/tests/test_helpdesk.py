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
async def test_helpdesk_flow(client: AsyncClient):
    token = await get_auth_token(client, "+919876500001")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Society
    create_res = await client.post(
        "/api/v1/societies",
        headers=headers,
        json={
            "name": "Helpdesk Society",
            "slug": "helpdesk-society",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560102",
            "country": "IN",
        },
    )
    assert create_res.status_code == 201
    society = create_res.json()
    society_id = society["id"]

    # 2. Create Ticket
    ticket_res = await client.post(
        f"/api/v1/societies/{society_id}/helpdesk/tickets",
        headers=headers,
        json={
            "title": "Leaking Pipe",
            "description": "Pipe is leaking in the kitchen",
            "category": "plumbing",
            "priority": "high"
        }
    )
    assert ticket_res.status_code == 201
    ticket = ticket_res.json()
    assert ticket["title"] == "Leaking Pipe"
    assert ticket["status"] == "OPEN"
    ticket_id = ticket["id"]

    # 3. Add Comment
    comment_res = await client.post(
        f"/api/v1/societies/{society_id}/helpdesk/tickets/{ticket_id}/comments",
        headers=headers,
        json={
            "message": "Plumber will arrive at 5 PM",
            "is_internal": False
        }
    )
    assert comment_res.status_code == 201
    
    # 4. Update Status
    status_res = await client.patch(
        f"/api/v1/societies/{society_id}/helpdesk/tickets/{ticket_id}/status",
        headers=headers,
        json={
            "status": "RESOLVED",
            "resolution_notes": "Replaced the pipe."
        }
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "RESOLVED"
    
    # 5. List Tickets
    list_res = await client.get(
        f"/api/v1/societies/{society_id}/helpdesk/tickets",
        headers=headers,
    )
    assert list_res.status_code == 200
    tickets = list_res.json()
    assert len(tickets) >= 1
