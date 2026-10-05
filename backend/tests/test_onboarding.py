import io
import uuid
import pytest
from httpx import AsyncClient
from app.modules.auth.models import User
from app.database import AsyncSessionLocal
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_society_full_onboarding_and_csv_bulk_import(client: AsyncClient):
    # 1. Setup platform admin user
    user_id = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        user = User(
            id=user_id,
            phone="+919876543201",
            full_name="Onboarding Master Admin",
            is_active=True,
            phone_verified=True,
            is_platform_admin=True,
        )
        db.add(user)
        await db.commit()

    token = create_access_token(data={"sub": str(user_id), "phone": "+919876543201"})
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test POST /societies/onboard
    onboard_payload = {
        "name": "Skyline Grandeur Estates",
        "slug": "skyline-grandeur",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560102",
        "country": "IN",
        "towers": [
            {"name": "Tower A", "code": "T-A", "floors": 3, "units_per_floor": 2},
            {"name": "Tower B", "code": "T-B", "floors": 2, "units_per_floor": 2},
        ],
        "gates": [
            {"name": "North Main Gate", "code": "GATE-01", "gate_type": "entry_exit"},
            {"name": "Service Gate", "code": "GATE-02", "gate_type": "service_delivery"},
        ],
        "residents": [
            {
                "name": "Rahul Sharma",
                "phone": "+919876511111",
                "flat_number": "101",
                "tower_name": "Tower A",
                "email": "rahul@skyline.com",
                "membership_type": "owner",
            }
        ],
    }

    res = await client.post("/api/v1/societies/onboard", json=onboard_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    society_id = data["society"]["id"]
    assert data["towers_created"] == 2
    assert data["units_created"] == 10  # 3*2 + 2*2 = 10 units
    assert data["gates_created"] == 2
    assert data["residents_onboarded"] == 1

    # 3. Test Bulk CSV Upload for remaining flats
    csv_content = (
        "Flat,Tower,Name,Phone,Email,Type\n"
        "102,Tower A,Priya Nair,+919876522222,priya@skyline.com,tenant\n"
        "201,Tower A,Amit Patel,+919876533333,amit@skyline.com,owner\n"
    )
    files = {"file": ("residents.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    csv_res = await client.post(
        f"/api/v1/societies/{society_id}/residents/bulk-csv",
        files=files,
        headers=headers,
    )
    assert csv_res.status_code == 200
    csv_data = csv_res.json()
    assert csv_data["total_rows_processed"] == 2
    assert csv_data["residents_onboarded"] == 2
    assert len(csv_data["unmatched_flats"]) == 0
