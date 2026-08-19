import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppException
from app.modules.auth.models import User
from app.modules.vehicles.models import VehicleProfile
from app.modules.vehicles.schemas import VehicleCreate

class VehicleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_vehicle(
        self, society_id: uuid.UUID, payload: VehicleCreate, user: User
    ) -> VehicleProfile:
        reg_num = payload.registration_number.strip().upper().replace(" ", "")
        existing = await self.db.execute(
            select(VehicleProfile).where(
                VehicleProfile.society_id == society_id,
                VehicleProfile.registration_number == reg_num,
                VehicleProfile.is_active.is_(True),
            )
        )
        if existing.scalar_one_or_none():
            raise AppException(code="VEHICLE_EXISTS", message="Vehicle with this registration number is already registered", status_code=400)

        vehicle = VehicleProfile(
            society_id=society_id,
            unit_id=payload.unit_id,
            user_id=user.id,
            registration_number=reg_num,
            vehicle_type=payload.vehicle_type,
            make=payload.make,
            model=payload.model,
            color=payload.color,
            parking_slot=payload.parking_slot,
            sticker_id=payload.sticker_id,
        )
        self.db.add(vehicle)
        await self.db.commit()
        await self.db.refresh(vehicle)
        return vehicle

    async def list_vehicles(
        self, society_id: uuid.UUID, unit_id: uuid.UUID | None = None
    ) -> list[VehicleProfile]:
        query = select(VehicleProfile).where(
            VehicleProfile.society_id == society_id, VehicleProfile.is_active.is_(True)
        )
        if unit_id:
            query = query.where(VehicleProfile.unit_id == unit_id)
        query = query.order_by(VehicleProfile.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete_vehicle(self, society_id: uuid.UUID, vehicle_id: uuid.UUID):
        result = await self.db.execute(
            select(VehicleProfile).where(
                VehicleProfile.id == vehicle_id, VehicleProfile.society_id == society_id
            )
        )
        veh = result.scalar_one_or_none()
        if veh:
            veh.is_active = False
            await self.db.commit()
