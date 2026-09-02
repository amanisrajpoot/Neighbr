import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.iot.models import IoTDevice, DeviceCommandLog

class IoTRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_device(self, society_id: uuid.UUID, device_id: uuid.UUID) -> Optional[IoTDevice]:
        res = await self.db.execute(
            select(IoTDevice).where(
                IoTDevice.id == device_id, IoTDevice.society_id == society_id
            )
        )
        return res.scalar_one_or_none()

    async def list_devices(self, society_id: uuid.UUID) -> List[IoTDevice]:
        res = await self.db.execute(
            select(IoTDevice)
            .where(IoTDevice.society_id == society_id)
            .options(selectinload(IoTDevice.commands))
            .order_by(IoTDevice.created_at.desc())
        )
        return list(res.scalars().all())

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)

    async def commit(self) -> None:
        await self.db.commit()
