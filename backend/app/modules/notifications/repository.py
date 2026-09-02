import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.models import Notification

class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_notification(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> Optional[Notification]:
        res = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.recipient_user_id == user_id,
            )
        )
        return res.scalar_one_or_none()

    async def list_notifications(self, user_id: uuid.UUID, limit: int = 50) -> List[Notification]:
        res = await self.db.execute(
            select(Notification)
            .where(Notification.recipient_user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(res.scalars().all())

    async def mark_all_read(self, user_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Notification)
            .where(Notification.recipient_user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )
        await self.db.commit()

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        res = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.recipient_user_id == user_id, Notification.is_read.is_(False)
            )
        )
        return res.scalar_one() or 0

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)

    async def flush(self, obj) -> None:
        self.db.add(obj)
        await self.db.flush()

    async def commit(self) -> None:
        await self.db.commit()
