import uuid
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict

class AmenityCreate(BaseModel):
    name: str
    code: str
    category: str = "sports"
    description: str | None = None
    image_url: str | None = None
    capacity_per_slot: int = 4
    slot_duration_minutes: int = 60
    open_time: str = "06:00"
    close_time: str = "22:00"
    rules: list[str] = []
    is_paid: bool = False
    price_per_slot: float = 0.0

class AmenityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    name: str
    code: str
    category: str
    description: str | None = None
    image_url: str | None = None
    capacity_per_slot: int
    slot_duration_minutes: int
    open_time: str
    close_time: str
    rules: list[str] = []
    is_paid: bool
    price_per_slot: float
    is_active: bool
    created_at: datetime

class SlotItem(BaseModel):
    start_time: str
    end_time: str
    max_capacity: int
    booked_count: int
    available_capacity: int
    is_available: bool

class BookingCreate(BaseModel):
    booking_date: date
    start_time: str
    end_time: str
    guest_count: int = 1
    unit_id: uuid.UUID | None = None

class BookingCancelRequest(BaseModel):
    reason: str | None = None

class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    amenity_id: uuid.UUID
    amenity_name: str | None = None
    unit_id: uuid.UUID | None = None
    unit_number: str | None = None
    booked_by: uuid.UUID
    user_name: str | None = None
    booking_date: date
    start_time: str
    end_time: str
    guest_count: int
    total_amount: float
    status: str
    qr_pass: str
    cancellation_reason: str | None = None
    created_at: datetime
