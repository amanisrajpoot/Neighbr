import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_request_otp(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/otp/request",
        json={"phone": "+919876543210"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["phone"] == "+919876543210"
    assert data["expires_in_seconds"] == 300
    assert data["dev_otp"] == "123456"

@pytest.mark.asyncio
async def test_verify_otp_and_login(client: AsyncClient):
    # 1. Request OTP
    await client.post(
        "/api/v1/auth/otp/request",
        json={"phone": "+919876543210"},
    )

    # 2. Verify OTP
    verify_res = await client.post(
        "/api/v1/auth/otp/verify",
        json={
            "phone": "+919876543210",
            "otp": "123456",
            "device_id": "test-device-uuid-123",
            "device_name": "Test iPhone 15",
            "platform": "ios",
        },
    )
    assert verify_res.status_code == 200
    tokens = verify_res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["user"]["phone"] == "+919876543210"
    assert tokens["user"]["phone_verified"] is True

    # 3. Access protected route /auth/me
    access_token = tokens["access_token"]
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["phone"] == "+919876543210"

    # 4. Update profile
    patch_res = await client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"full_name": "Aman Kumar", "email": "aman@example.com"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["full_name"] == "Aman Kumar"

    # 5. Refresh token
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()
    assert "access_token" in new_tokens
    assert new_tokens["access_token"] != tokens["access_token"]

@pytest.mark.asyncio
async def test_invalid_otp(client: AsyncClient):
    await client.post(
        "/api/v1/auth/otp/request",
        json={"phone": "+919999999999"},
    )
    verify_res = await client.post(
        "/api/v1/auth/otp/verify",
        json={
            "phone": "+919999999999",
            "otp": "000000",
            "device_id": "test-device-uuid-123",
            "platform": "android",
        },
    )
    assert verify_res.status_code == 400
    assert verify_res.json()["error"]["code"] == "INVALID_OTP"
