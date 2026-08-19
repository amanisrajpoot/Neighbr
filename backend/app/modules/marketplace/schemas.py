import uuid
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from typing import Any

class ListingCreate(BaseModel):
    title: str
    description: str
    category: str = "furniture"
    price: float = 0.0
    is_free: bool = False
    images: list[str] = []
    unit_id: uuid.UUID | None = None

class ListingStatusUpdate(BaseModel):
    status: str  # ACTIVE, SOLD, RESERVED, REMOVED

class ListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    seller_id: uuid.UUID
    seller_name: str | None = None
    seller_phone: str | None = None
    unit_number: str | None = None
    title: str
    description: str
    category: str
    price: float
    is_free: bool
    images: list[str] = []
    status: str
    created_at: datetime

class VendorCreate(BaseModel):
    vendor_name: str
    category: str
    description: str | None = None
    contact_phone: str
    is_verified: bool = True
    pricing_starts_at: float = 299.0

class VendorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    vendor_name: str
    category: str
    description: str | None = None
    contact_phone: str
    is_verified: bool
    rating: float
    review_count: int
    pricing_starts_at: float
    is_active: bool

class ServiceBookingCreate(BaseModel):
    vendor_id: uuid.UUID
    booking_date: date
    time_slot: str
    notes: str | None = None
    unit_id: uuid.UUID | None = None

class ServiceBookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    vendor_id: uuid.UUID
    vendor_name: str | None = None
    vendor_phone: str | None = None
    resident_name: str | None = None
    unit_number: str | None = None
    booking_date: date
    time_slot: str
    notes: str | None = None
    gate_pass_code: str
    status: str
    created_at: datetime
