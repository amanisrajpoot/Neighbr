import uuid
import logging
from typing import Any
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import UserDevice
from app.modules.notifications.models import NotificationDelivery

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

class PushNotificationService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)

    async def send_expo_push_messages(
        self,
        messages: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Sends an array of push notifications to Expo Push service in batches.
        Docs: https://docs.expo.dev/push-notifications/sending-notifications/
        """
        if not messages:
            return []

        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
        }

        results = []
        # Expo accepts up to 100 messages per chunk
        chunk_size = 100
        for i in range(0, len(messages), chunk_size):
            chunk = messages[i : i + chunk_size]
            try:
                response = await self.client.post(
                    EXPO_PUSH_URL,
                    json=chunk,
                    headers=headers,
                )
                if response.status_code == 200:
                    data = response.json().get("data", [])
                    results.extend(data)
                else:
                    logger.warning(
                        f"Expo push endpoint responded with status {response.status_code}: {response.text}"
                    )
            except Exception as e:
                logger.error(f"Failed to transmit push batch to Expo: {e}", exc_info=True)

        return results

    async def dispatch_push_to_users(
        self,
        db: AsyncSession,
        user_ids: list[uuid.UUID],
        title: str,
        body: str,
        category: str = "visitor",
        notification_id: uuid.UUID | None = None,
        data: dict[str, Any] | None = None,
        sound: str = "default",
        priority: str = "high",
    ) -> int:
        """
        Looks up registered devices for the given users and dispatches push notifications.
        Returns the number of push messages successfully queued.
        """
        if not user_ids:
            return 0

        # Query all active device push tokens for these users
        stmt = (
            select(UserDevice)
            .where(
                UserDevice.user_id.in_(user_ids),
                UserDevice.is_active.is_(True),
                UserDevice.push_token.isnot(None),
            )
        )
        res = await db.execute(stmt)
        devices = res.scalars().all()

        if not devices:
            return 0

        payload_data = data or {}
        payload_data.update({"category": category})
        if notification_id:
            payload_data["notification_id"] = str(notification_id)

        messages = []
        for dev in devices:
            token = dev.push_token
            if not token:
                continue
            messages.append({
                "to": token,
                "title": title,
                "body": body,
                "sound": sound,
                "priority": priority,
                "channelId": "security" if category in ("security", "emergency") else "default",
                "data": payload_data,
            })

        if not messages:
            return 0

        results = await self.send_expo_push_messages(messages)

        # Log delivery status in notification_deliveries if notification_id is provided
        if notification_id:
            try:
                delivery = NotificationDelivery(
                    notification_id=notification_id,
                    channel="push",
                    status="sent" if results else "pending",
                    provider="expo",
                )
                db.add(delivery)
                await db.commit()
            except Exception as d_err:
                logger.warning(f"Could not record push delivery status: {d_err}")

        return len(messages)

push_service = PushNotificationService()
