import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import event_bus, DomainEvent
from app.modules.notifications.models import Notification, NotificationDelivery
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.events import NOTIFICATION_SENT, NOTIFICATION_READ
from app.modules.notifications.schemas import NotificationCreate

class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationRepository(db)

    async def create_notification(
        self, society_id: uuid.UUID | None, payload: NotificationCreate
    ) -> Notification:
        notif = Notification(
            society_id=society_id,
            recipient_user_id=payload.recipient_user_id,
            title=payload.title,
            body=payload.body,
            category=payload.category,
            action_type=payload.action_type,
            action_data=payload.action_data,
        )
        await self.repo.flush(notif)

        delivery = NotificationDelivery(
            notification_id=notif.id,
            channel="in_app",
            status="delivered",
            sent_at=datetime.now(timezone.utc),
        )
        self.db.add(delivery)
        await self.repo.commit()
        await self.db.refresh(notif)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id) if society_id else "",
                actor_user_id="SYSTEM",
                event_type=NOTIFICATION_SENT,
                entity_type="notification",
                entity_id=str(notif.id),
                payload={"title": notif.title, "recipient_id": str(payload.recipient_user_id)},
            )
        )
        return notif

    async def list_notifications(
        self, user_id: uuid.UUID, limit: int = 50
    ) -> list[Notification]:
        return await self.repo.list_notifications(user_id, limit)

    async def mark_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> Notification | None:
        notif = await self.repo.get_notification(user_id, notification_id)
        if notif:
            notif.is_read = True
            notif.read_at = datetime.now(timezone.utc)
            await self.repo.commit()
            await self.db.refresh(notif)

            await event_bus.publish(
                DomainEvent(
                    society_id=str(notif.society_id) if notif.society_id else "",
                    actor_user_id=str(user_id),
                    event_type=NOTIFICATION_READ,
                    entity_type="notification",
                    entity_id=str(notif.id),
                    payload={},
                )
            )
        return notif

    async def mark_all_read(self, user_id: uuid.UUID):
        await self.repo.mark_all_read(user_id)

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        return await self.repo.get_unread_count(user_id)
