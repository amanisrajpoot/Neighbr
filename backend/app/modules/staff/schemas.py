import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Any
from app.modules.societies.schemas import UnitOut

class StaffCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: str | None = None
    photo_url: str | None = None
    staff_type: str = "maid"
    id_proof_type: str | None = None
    id_proof_number: str | None = None

class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    name: str
    phone: str | None = None
    photo_url: str | None = None
    staff_type: str
    id_proof_type: str | None = None
    id_proof_number: str | None = None
    is_active: bool
    created_at: datetime

class StaffAssignRequest(BaseModel):
    unit_id: uuid.UUID
    schedule: dict[str, Any] = {}

class StaffAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    staff_id: uuid.UUID
    unit_id: uuid.UUID
    society_id: uuid.UUID
    schedule: dict[str, Any]
    is_active: bool
    created_at: datetime
    staff: StaffOut | None = None
    unit: UnitOut | None = None

class StaffAttendanceCheckIn(BaseModel):
    gate_id: uuid.UUID | None = None
    unit_id: uuid.UUID | None = None
    idempotency_key: str = Field(..., min_length=1)

class StaffAttendanceCheckOut(BaseModel):
    idempotency_key: str = Field(..., min_length=1)

class StaffAttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    staff_id: uuid.UUID
    society_id: uuid.UUID
    gate_id: uuid.UUID | None = None
    unit_id: uuid.UUID | None = None
    check_in_at: datetime
    check_out_at: datetime | None = None
    created_at: datetime
    staff: StaffOut | None = None
