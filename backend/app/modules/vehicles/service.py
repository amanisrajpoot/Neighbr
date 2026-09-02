import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.vehicles.models import VehicleProfile
from app.modules.vehicles.repository import VehicleRepository
from app.modules.vehicles.events import VEHICLE_REGISTERED, VEHICLE_DELETED
from app.modules.vehicles.schemas import VehicleCreate

class VehicleService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = VehicleRepository(db)

    async def register_vehicle(
        self, society_id: uuid.UUID, payload: VehicleCreate, user: User
    ) -> VehicleProfile:
        reg_num = payload.registration_number.strip().upper().replace(" ", "")
        existing = await self.repo.get_by_reg_num(society_id, reg_num)
        
        if existing:
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
        await self.repo.save(vehicle)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(user.id),
                event_type=VEHICLE_REGISTERED,
                entity_type="vehicle",
                entity_id=str(vehicle.id),
                payload={"registration_number": vehicle.registration_number},
            )
        )
        return vehicle

    async def list_vehicles(
        self, society_id: uuid.UUID, unit_id: uuid.UUID | None = None
    ) -> list[VehicleProfile]:
        return await self.repo.list_vehicles(society_id, unit_id)

    async def delete_vehicle(self, society_id: uuid.UUID, vehicle_id: uuid.UUID, user: User):
        veh = await self.repo.get_by_id(society_id, vehicle_id)
        if veh:
            veh.is_active = False
            await self.repo.commit()

            await event_bus.publish(
                DomainEvent(
                    society_id=str(society_id),
                    actor_user_id=str(user.id),
                    event_type=VEHICLE_DELETED,
                    entity_type="vehicle",
                    entity_id=str(veh.id),
                    payload={"registration_number": veh.registration_number},
                )
            )
