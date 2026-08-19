import uuid
from datetime import date
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.middleware.tenancy import require_society_membership, require_roles
from app.modules.auth.models import User
from app.modules.amenities.schemas import (
    AmenityCreate,
    AmenityOut,
    SlotItem,
    BookingCreate,
    BookingCancelRequest,
    BookingOut,
)
from app.modules.amenities.service import AmenityService

router = APIRouter(prefix="/societies/{society_id}/amenities", tags=["Clubhouse & Amenities"])

def _format_booking(b) -> BookingOut:
    return BookingOut(
        id=b.id,
        society_id=b.society_id,
        amenity_id=b.amenity_id,
        amenity_name=b.amenity.name if b.amenity else None,
        unit_id=b.unit_id,
        unit_number=b.unit.unit_number if b.unit else None,
        booked_by=b.booked_by,
        user_name=b.user.full_name if b.user else None,
        booking_date=b.booking_date,
        start_time=b.start_time,
        end_time=b.end_time,
        guest_count=b.guest_count,
        total_amount=float(b.total_amount),
        status=b.status,
        qr_pass=b.qr_pass,
        cancellation_reason=b.cancellation_reason,
        created_at=b.created_at,
    )

@router.post("", response_model=AmenityOut, status_code=status.HTTP_201_CREATED)
async def create_amenity(
    society_id: uuid.UUID,
    payload: AmenityCreate,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = AmenityService(db)
    return await service.create_amenity(society_id, payload)

@router.get("", response_model=list[AmenityOut])
async def list_amenities(
    society_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = AmenityService(db)
    return await service.list_amenities(society_id)

@router.get("/{amenity_id}/slots", response_model=list[SlotItem])
async def get_amenity_slots(
    society_id: uuid.UUID,
    amenity_id: uuid.UUID,
    date: date = Query(default_factory=date.today),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = AmenityService(db)
    return await service.get_slots_for_date(society_id, amenity_id, date)

@router.post("/{amenity_id}/book", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def book_amenity(
    society_id: uuid.UUID,
    amenity_id: uuid.UUID,
    payload: BookingCreate,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = AmenityService(db)
    booking = await service.book_slot(society_id, amenity_id, payload, user)
    bookings = await service.list_bookings(society_id, user_id=user.id)
    created = next((b for b in bookings if b.id == booking.id), booking)
    return _format_booking(created)

@router.get("/bookings", response_model=list[BookingOut])
async def list_bookings(
    society_id: uuid.UUID,
    unit_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    amenity_id: uuid.UUID | None = None,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = AmenityService(db)
    bookings = await service.list_bookings(society_id, unit_id=unit_id, user_id=user_id, amenity_id=amenity_id)
    return [_format_booking(b) for b in bookings]

@router.post("/bookings/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(
    society_id: uuid.UUID,
    booking_id: uuid.UUID,
    payload: BookingCancelRequest = None,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = AmenityService(db)
    reason = payload.reason if payload else None
    booking = await service.cancel_booking(society_id, booking_id, user, reason)
    bookings = await service.list_bookings(society_id)
    cancelled = next((b for b in bookings if b.id == booking.id), booking)
    return _format_booking(cancelled)
