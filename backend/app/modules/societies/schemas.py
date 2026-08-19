import uuid
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict
from typing import Any
from app.modules.auth.schemas import UserOut

# Role Schema
class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    display_name: str
    description: str | None = None

# Society Schemas
class SocietyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    address_line1: str | None = None
    address_line2: str | None = None
    city: str
    state: str
    pincode: str
    country: str = "IN"
    logo_url: str | None = None
    cover_image_url: str | None = None

class SocietyUpdate(BaseModel):
    name: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    logo_url: str | None = None
    cover_image_url: str | None = None
    is_active: bool | None = None

class SocietySettingsUpdate(BaseModel):
    visitor_approval_required: bool | None = None
    visitor_photo_required: bool | None = None
    delivery_auto_approve: bool | None = None
    cab_auto_approve: bool | None = None
    pass_default_duration_hours: int | None = None
    max_pass_duration_hours: int | None = None
    guard_offline_allowed: bool | None = None
    emergency_contacts: list[dict[str, Any]] | None = None
    working_hours: dict[str, Any] | None = None
    notification_rules: dict[str, Any] | None = None

class SocietySettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    society_id: uuid.UUID
    visitor_approval_required: bool
    visitor_photo_required: bool
    delivery_auto_approve: bool
    cab_auto_approve: bool
    pass_default_duration_hours: int
    max_pass_duration_hours: int
    guard_offline_allowed: bool
    emergency_contacts: list[dict[str, Any]]
    working_hours: dict[str, Any]
    notification_rules: dict[str, Any]

class SocietyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    address_line1: str | None = None
    address_line2: str | None = None
    city: str
    state: str
    pincode: str
    country: str
    logo_url: str | None = None
    cover_image_url: str | None = None
    total_units: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

# Building Schemas
class BuildingCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str | None = None
    total_floors: int = 0
    sort_order: int = 0

class BuildingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    name: str
    code: str | None = None
    total_floors: int
    total_units: int
    sort_order: int
    is_active: bool
    created_at: datetime

# Floor Schemas
class FloorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    floor_number: int
    sort_order: int = 0

class FloorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    building_id: uuid.UUID
    society_id: uuid.UUID
    name: str
    floor_number: int
    sort_order: int
    created_at: datetime

# Unit Schemas
class UnitCreate(BaseModel):
    building_id: uuid.UUID
    floor_id: uuid.UUID | None = None
    unit_number: str = Field(..., min_length=1, max_length=20)
    unit_type: str = "apartment"
    area_sqft: float | None = None

class UnitBulkCreateItem(BaseModel):
    unit_number: str
    floor_number: int | None = None
    unit_type: str = "apartment"
    area_sqft: float | None = None

class UnitBulkCreate(BaseModel):
    building_id: uuid.UUID
    units: list[UnitBulkCreateItem]

class UnitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    building_id: uuid.UUID
    floor_id: uuid.UUID | None = None
    unit_number: str
    unit_type: str
    area_sqft: float | None = None
    is_occupied: bool
    is_active: bool
    created_at: datetime

# Membership & Resident Schemas
class AddMemberRequest(BaseModel):
    phone: str
    full_name: str | None = None
    unit_id: uuid.UUID | None = None
    role_code: str = "resident"
    membership_type: str | None = "owner"
    is_primary: bool = False

class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    society_id: uuid.UUID
    unit_id: uuid.UUID | None = None
    role_id: uuid.UUID
    membership_type: str | None = None
    is_primary: bool
    is_active: bool
    created_at: datetime
    user: UserOut | None = None
    unit: UnitOut | None = None
    role: RoleOut | None = None

# Family Schemas
class FamilyMemberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: str | None = None
    relation: str | None = None
    age_group: str = "adult"
    photo_url: str | None = None

class FamilyMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    membership_id: uuid.UUID
    society_id: uuid.UUID
    name: str
    phone: str | None = None
    relation: str | None = None
    age_group: str | None = None
    photo_url: str | None = None
    is_active: bool
    created_at: datetime
