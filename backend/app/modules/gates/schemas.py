import uuid
from datetime import datetime, time, date
from pydantic import BaseModel, Field, ConfigDict
from typing import Any
from app.modules.auth.schemas import UserOut

class GateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str | None = None
    gate_type: str = "entry_exit"
    location: dict[str, Any] | None = None

class GateUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    gate_type: str | None = None
    is_active: bool | None = None
    is_online: bool | None = None
    location: dict[str, Any] | None = None

class GateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    name: str
    code: str | None = None
    gate_type: str
    is_active: bool
    is_online: bool
    last_heartbeat_at: datetime | None = None
    location: dict[str, Any] | None = None
    created_at: datetime

class GuardCreate(BaseModel):
    phone: str
    full_name: str
    employee_id: str | None = None
    id_proof_type: str | None = None
    id_proof_number: str | None = None
    photo_url: str | None = None

class GuardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    society_id: uuid.UUID
    employee_id: str | None = None
    id_proof_type: str | None = None
    id_proof_number: str | None = None
    photo_url: str | None = None
    is_active: bool
    created_at: datetime
    user: UserOut | None = None

class GuardShiftCreate(BaseModel):
    name: str
    start_time: time
    end_time: time

class GuardShiftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    name: str
    start_time: time
    end_time: time
    created_at: datetime

class GuardAssignRequest(BaseModel):
    gate_id: uuid.UUID
    shift_id: uuid.UUID | None = None
    assigned_date: date | None = None

class GuardAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    guard_id: uuid.UUID
    gate_id: uuid.UUID
    shift_id: uuid.UUID | None = None
    society_id: uuid.UUID
    assigned_date: date | None = None
    is_active: bool
    created_at: datetime
    guard: GuardOut | None = None
    gate: GateOut | None = None
    shift: GuardShiftOut | None = None

class GuardDutyCheckIn(BaseModel):
    gate_id: uuid.UUID
    location: dict[str, Any] | None = None

class GuardDutyCheckOut(BaseModel):
    location: dict[str, Any] | None = None

class GuardAttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    guard_id: uuid.UUID
    gate_id: uuid.UUID | None = None
    society_id: uuid.UUID
    check_in_at: datetime
    check_out_at: datetime | None = None
    status: str
    created_at: datetime
