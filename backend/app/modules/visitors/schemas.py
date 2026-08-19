import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Any
from app.modules.auth.schemas import UserOut
from app.modules.societies.schemas import UnitOut

class VisitorProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone: str | None = None
    name: str
    photo_url: str | None = None
    company: str | None = None
    created_at: datetime

class CreateVisitorPassRequest(BaseModel):
    unit_id: uuid.UUID
    pass_type: str = "guest"  # guest, delivery, cab, service, staff, recurring
    visitor_name: str = Field(..., min_length=1, max_length=255)
    visitor_phone: str | None = None
    visitor_company: str | None = None
    purpose: str | None = None
    vehicle_number: str | None = None
    gate_restriction: uuid.UUID | None = None
    valid_from: datetime
    valid_until: datetime
    is_recurring: bool = False
    notes: str | None = None

class VisitorPassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    unit_id: uuid.UUID
    visitor_id: uuid.UUID | None = None
    issued_by: uuid.UUID
    pass_type: str
    visitor_name: str
    visitor_phone: str | None = None
    visitor_company: str | None = None
    purpose: str | None = None
    vehicle_number: str | None = None
    pass_code: str | None = None
    qr_token: str
    valid_from: datetime
    valid_until: datetime
    status: str
    notes: str | None = None
    created_at: datetime
    unit: UnitOut | None = None
    issuer: UserOut | None = None

class ScanPassRequest(BaseModel):
    qr_token: str | None = None
    pin_code: str | None = None
    guard_notes: str | None = None

class GateCheckInRequest(BaseModel):
    pass_id: uuid.UUID | None = None
    qr_token: str | None = None
    visitor_name: str | None = None
    visitor_phone: str | None = None
    visitor_photo_url: str | None = None
    unit_id: uuid.UUID | None = None
    vehicle_number: str | None = None
    idempotency_key: str = Field(..., min_length=1)
    is_offline: bool = False
    device_id: str | None = None

class GateCheckOutRequest(BaseModel):
    pass_id: uuid.UUID | None = None
    event_id: uuid.UUID | None = None
    idempotency_key: str = Field(..., min_length=1)
    is_offline: bool = False

class VisitorEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    pass_id: uuid.UUID | None = None
    visitor_id: uuid.UUID | None = None
    unit_id: uuid.UUID | None = None
    gate_id: uuid.UUID | None = None
    guard_id: uuid.UUID | None = None
    event_type: str
    visitor_name: str | None = None
    visitor_phone: str | None = None
    visitor_photo_url: str | None = None
    vehicle_number: str | None = None
    entry_method: str | None = None
    is_offline: bool
    occurred_at: datetime
    created_at: datetime

class BlacklistCreate(BaseModel):
    entity_type: str = "phone"  # person, phone, vehicle
    entity_value: str
    reason: str | None = None

class BlacklistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    entity_type: str
    entity_value: str
    reason: str | None = None
    is_active: bool
    created_at: datetime
