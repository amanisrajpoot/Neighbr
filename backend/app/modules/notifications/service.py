import uuid
from datetime import datetime, timezone
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.models import Notification, NotificationDelivery
from app.modules.notifications.schemas import NotificationCreate

class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

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
        self.db.add(notif)
        await self.db.flush()

        delivery = NotificationDelivery(
            notification_id=notif.id,
            channel="in_app",
            status="delivered",
            sent_at=datetime.now(timezone.utc),
        )
        self.db.add(delivery)
        await self.db.commit()
        await self.db.refresh(notif)
        return notif

    async def list_notifications(
        self, user_id: uuid.UUID, limit: int = 50
    ) -> list[Notification]:
        result = await self.db.execute(
            select(Notification)
            .where(Notification.recipient_user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def mark_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> Notification | None:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.recipient_user_id == user_id,
            )
        )
        notif = result.scalar_one_or_none()
        if notif:
            notif.is_read = True
            notif.read_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(notif)
        return notif

    async def mark_all_read(self, user_id: uuid.UUID):
        await self.db.execute(
            update(Notification)
            .where(Notification.recipient_user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )
        await self.db.commit()

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.recipient_user_id == user_id, Notification.is_read.is_(False)
            )
        )
        return result.scalar_one() or 0
