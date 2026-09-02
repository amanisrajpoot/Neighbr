import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.vehicles.models import VehicleProfile

class VehicleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_reg_num(self, society_id: uuid.UUID, reg_num: str) -> Optional[VehicleProfile]:
        res = await self.db.execute(
            select(VehicleProfile).where(
                VehicleProfile.society_id == society_id,
                VehicleProfile.registration_number == reg_num,
                VehicleProfile.is_active.is_(True),
            )
        )
        return res.scalar_one_or_none()

    async def get_by_id(self, society_id: uuid.UUID, vehicle_id: uuid.UUID) -> Optional[VehicleProfile]:
        res = await self.db.execute(
            select(VehicleProfile).where(
                VehicleProfile.id == vehicle_id,
                VehicleProfile.society_id == society_id,
            )
        )
        return res.scalar_one_or_none()

    async def list_vehicles(self, society_id: uuid.UUID, unit_id: Optional[uuid.UUID] = None) -> List[VehicleProfile]:
        query = select(VehicleProfile).where(
            VehicleProfile.society_id == society_id, VehicleProfile.is_active.is_(True)
        )
        if unit_id:
            query = query.where(VehicleProfile.unit_id == unit_id)
        query = query.order_by(VehicleProfile.created_at.desc())
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)

    async def commit(self) -> None:
        await self.db.commit()
