import uuid
from typing import Optional, List
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.amenities.models import Amenity, AmenityBooking

class AmenityRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_amenity_by_id(self, society_id: uuid.UUID, amenity_id: uuid.UUID) -> Optional[Amenity]:
        res = await self.db.execute(
            select(Amenity).where(Amenity.id == amenity_id, Amenity.society_id == society_id)
        )
        return res.scalar_one_or_none()

    async def list_amenities(self, society_id: uuid.UUID) -> List[Amenity]:
        res = await self.db.execute(
            select(Amenity).where(Amenity.society_id == society_id, Amenity.is_active.is_(True)).order_by(Amenity.name)
        )
        return list(res.scalars().all())

    async def get_active_bookings_for_date(self, amenity_id: uuid.UUID, target_date: date) -> List[AmenityBooking]:
        res = await self.db.execute(
            select(AmenityBooking).where(
                AmenityBooking.amenity_id == amenity_id,
                AmenityBooking.booking_date == target_date,
                AmenityBooking.status == "CONFIRMED",
            )
        )
        return list(res.scalars().all())

    async def get_active_bookings_for_slot(
        self, amenity_id: uuid.UUID, target_date: date, start_time: str
    ) -> List[AmenityBooking]:
        res = await self.db.execute(
            select(AmenityBooking).where(
                AmenityBooking.amenity_id == amenity_id,
                AmenityBooking.booking_date == target_date,
                AmenityBooking.start_time == start_time,
                AmenityBooking.status == "CONFIRMED",
            )
        )
        return list(res.scalars().all())

    async def list_bookings(
        self, society_id: uuid.UUID, unit_id: Optional[uuid.UUID] = None, user_id: Optional[uuid.UUID] = None, amenity_id: Optional[uuid.UUID] = None
    ) -> List[AmenityBooking]:
        query = (
            select(AmenityBooking)
            .where(AmenityBooking.society_id == society_id)
            .options(
                selectinload(AmenityBooking.amenity),
                selectinload(AmenityBooking.user),
                selectinload(AmenityBooking.unit),
            )
        )
        if unit_id:
            query = query.where(AmenityBooking.unit_id == unit_id)
        if user_id:
            query = query.where(AmenityBooking.booked_by == user_id)
        if amenity_id:
            query = query.where(AmenityBooking.amenity_id == amenity_id)

        query = query.order_by(AmenityBooking.booking_date.desc(), AmenityBooking.start_time.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_booking_by_id(self, society_id: uuid.UUID, booking_id: uuid.UUID) -> Optional[AmenityBooking]:
        res = await self.db.execute(
            select(AmenityBooking).where(AmenityBooking.id == booking_id, AmenityBooking.society_id == society_id)
        )
        return res.scalar_one_or_none()

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
