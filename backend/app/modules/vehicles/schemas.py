import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.modules.societies.schemas import UnitOut

class VehicleCreate(BaseModel):
    unit_id: uuid.UUID | None = None
    registration_number: str = Field(..., min_length=3, max_length=20)
    vehicle_type: str = "car"
    make: str | None = None
    model: str | None = None
    color: str | None = None
    parking_slot: str | None = None
    sticker_id: str | None = None

class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    unit_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    registration_number: str
    vehicle_type: str
    make: str | None = None
    model: str | None = None
    color: str | None = None
    parking_slot: str | None = None
    sticker_id: str | None = None
    is_active: bool
    created_at: datetime
    unit: UnitOut | None = None
