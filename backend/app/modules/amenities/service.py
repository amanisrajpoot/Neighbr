import uuid
import secrets
from datetime import datetime, timezone, date, timedelta, time
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.amenities.models import Amenity, AmenityBooking
from app.modules.amenities.repository import AmenityRepository
from app.modules.amenities.events import (
    AMENITY_CREATED,
    AMENITY_BOOKED,
    BOOKING_CANCELLED,
)
from app.modules.amenities.schemas import (
    AmenityCreate,
    BookingCreate,
    SlotItem,
)

def _generate_amenity_qr(amenity_code: str, booking_id: uuid.UUID) -> str:
    return f"AMN-{amenity_code}-{secrets.token_hex(4).upper()}"

class AmenityService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AmenityRepository(db)

    async def create_amenity(self, society_id: uuid.UUID, payload: AmenityCreate) -> Amenity:
        amenity = Amenity(
            society_id=society_id,
            name=payload.name.strip(),
            code=payload.code.strip().upper(),
            category=payload.category,
            description=payload.description,
            image_url=payload.image_url,
            capacity_per_slot=payload.capacity_per_slot,
            slot_duration_minutes=payload.slot_duration_minutes,
            open_time=payload.open_time,
            close_time=payload.close_time,
            rules=payload.rules,
            is_paid=payload.is_paid,
            price_per_slot=payload.price_per_slot,
        )
        await self.repo.save(amenity)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type=AMENITY_CREATED,
                entity_type="amenity",
                entity_id=str(amenity.id),
                payload={"name": amenity.name},
            )
        )
        return amenity

    async def list_amenities(self, society_id: uuid.UUID) -> list[Amenity]:
        return await self.repo.list_amenities(society_id)

    async def get_amenity(self, society_id: uuid.UUID, amenity_id: uuid.UUID) -> Amenity:
        amenity = await self.repo.get_amenity_by_id(society_id, amenity_id)
        if not amenity:
            raise AppException(code="AMENITY_NOT_FOUND", message="Clubhouse amenity not found", status_code=404)
        return amenity

    async def get_slots_for_date(self, society_id: uuid.UUID, amenity_id: uuid.UUID, target_date: date) -> list[SlotItem]:
        amenity = await self.get_amenity(society_id, amenity_id)
        
        # Parse opening and closing times
        open_h, open_m = map(int, amenity.open_time.split(":"))
        close_h, close_m = map(int, amenity.close_time.split(":"))
        duration = amenity.slot_duration_minutes or 60

        # Fetch active bookings for target date
        existing_bookings = await self.repo.get_active_bookings_for_date(amenity_id, target_date)

        current = datetime.combine(target_date, time(open_h, open_m))
        end = datetime.combine(target_date, time(close_h, close_m))

        slots: list[SlotItem] = []
        while current + timedelta(minutes=duration) <= end:
            slot_start = current.strftime("%H:%M")
            slot_end = (current + timedelta(minutes=duration)).strftime("%H:%M")

            # Count total guests booked in this specific slot
            booked_count = sum(
                b.guest_count
                for b in existing_bookings
                if b.start_time == slot_start
            )
            avail = max(0, amenity.capacity_per_slot - booked_count)

            slots.append(
                SlotItem(
                    start_time=slot_start,
                    end_time=slot_end,
                    max_capacity=amenity.capacity_per_slot,
                    booked_count=booked_count,
                    available_capacity=avail,
                    is_available=avail > 0,
                )
            )
            current += timedelta(minutes=duration)

        return slots

    async def book_slot(
        self, society_id: uuid.UUID, amenity_id: uuid.UUID, payload: BookingCreate, user: User
    ) -> AmenityBooking:
        amenity = await self.get_amenity(society_id, amenity_id)

        # Check existing bookings for capacity
        bookings = await self.repo.get_active_bookings_for_slot(amenity_id, payload.booking_date, payload.start_time)
        current_booked = sum(b.guest_count for b in bookings)

        if current_booked + payload.guest_count > amenity.capacity_per_slot:
            raise AppException(
                code="CAPACITY_EXCEEDED",
                message=f"Slot is fully booked. Only {amenity.capacity_per_slot - current_booked} spot(s) remaining.",
                status_code=400,
            )

        booking_id = uuid.uuid4()
        qr_pass = _generate_amenity_qr(amenity.code, booking_id)
        total_amount = float(amenity.price_per_slot) if amenity.is_paid else 0.0

        booking = AmenityBooking(
            id=booking_id,
            society_id=society_id,
            amenity_id=amenity.id,
            unit_id=payload.unit_id,
            booked_by=user.id,
            booking_date=payload.booking_date,
            start_time=payload.start_time,
            end_time=payload.end_time,
            guest_count=payload.guest_count,
            total_amount=total_amount,
            status="CONFIRMED",
            qr_pass=qr_pass,
        )
        await self.repo.save(booking)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(user.id),
                event_type=AMENITY_BOOKED,
                entity_type="amenity_booking",
                entity_id=str(booking.id),
                payload={"amenity_name": amenity.name, "booking_date": str(payload.booking_date), "start_time": payload.start_time},
            )
        )
        return booking

    async def list_bookings(
        self, society_id: uuid.UUID, unit_id: uuid.UUID | None = None, user_id: uuid.UUID | None = None, amenity_id: uuid.UUID | None = None
    ) -> list[AmenityBooking]:
        return await self.repo.list_bookings(society_id, unit_id, user_id, amenity_id)

    async def cancel_booking(
        self, society_id: uuid.UUID, booking_id: uuid.UUID, user: User, reason: str | None = None
    ) -> AmenityBooking:
        booking = await self.repo.get_booking_by_id(society_id, booking_id)
        if not booking:
            raise AppException(code="BOOKING_NOT_FOUND", message="Booking record not found", status_code=404)

        booking.status = "CANCELLED"
        booking.cancellation_reason = reason or "Cancelled by resident"
        await self.repo.save(booking)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(user.id),
                event_type=BOOKING_CANCELLED,
                entity_type="amenity_booking",
                entity_id=str(booking.id),
            )
        )
        return booking
