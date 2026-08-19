import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Any
from app.modules.auth.schemas import UserOut

class NoticeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)
    category: str = "general"
    priority: str = "normal"
    image_url: str | None = None
    document_url: str | None = None
    target_type: str = "all"
    target_ids: list[str] = []
    expires_at: datetime | None = None
    send_push: bool = False

class NoticeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    title: str
    body: str
    category: str
    priority: str
    image_url: str | None = None
    document_url: str | None = None
    target_type: str
    published_at: datetime | None = None
    expires_at: datetime | None = None
    send_push: bool
    created_at: datetime
    author: UserOut | None = None

class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    role: str | None = None
    sort_order: int = 0

class EmergencyContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    name: str
    phone: str
    role: str | None = None
    sort_order: int
    is_active: bool

class SOSCreate(BaseModel):
    unit_id: uuid.UUID | None = None
    sos_type: str = "security"
    message: str | None = None
    location: dict[str, Any] | None = None

class SOSOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    triggered_by: uuid.UUID
    unit_id: uuid.UUID | None = None
    sos_type: str
    message: str | None = None
    status: str
    created_at: datetime
    user: UserOut | None = None
