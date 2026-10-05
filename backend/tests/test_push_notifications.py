import uuid
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from app.database import AsyncSessionLocal
from app.modules.auth.models import User
from app.core.security import create_access_token
from app.modules.notifications.push_service import push_service

@pytest.mark.asyncio
async def test_push_token_registration_and_dispatch(client: AsyncClient):
    user_id = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        user = User(
            id=user_id,
            phone="+919876543299",
            full_name="Push Tester",
            is_active=True,
            phone_verified=True,
        )
        db.add(user)
        await db.commit()

    token = create_access_token(data={"sub": str(user_id), "phone": "+919876543299"})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Register push token via endpoint
    reg_res = await client.post(
        "/api/v1/auth/device/push-token",
        headers=headers,
        json={
            "device_id": "test-device-uuid-123",
            "push_token": "ExponentPushToken[mock_token_abc_123]",
            "platform": "android",
            "device_name": "Google Pixel 8",
        },
    )
    assert reg_res.status_code == 200
    assert reg_res.json()["status"] == "success"

    # 2. Test dispatching push notification to this user
    with patch.object(push_service, "send_expo_push_messages", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = [{"status": "ok", "id": "test-push-id"}]

        async with AsyncSessionLocal() as db:
            sent_count = await push_service.dispatch_push_to_users(
                db=db,
                user_ids=[user_id],
                title="Visitor at Gate",
                body="Delivery arrived for Flat 101",
                category="visitor",
            )
            assert sent_count == 1
            mock_send.assert_called_once()
            called_messages = mock_send.call_args[0][0]
            assert len(called_messages) == 1
            assert called_messages[0]["to"] == "ExponentPushToken[mock_token_abc_123]"
            assert called_messages[0]["title"] == "Visitor at Gate"
