import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Any

class NotificationCreate(BaseModel):
    recipient_user_id: uuid.UUID
    title: str
    body: str
    category: str = "visitor"
    action_type: str | None = None
    action_data: dict[str, Any] = {}

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID | None = None
    recipient_user_id: uuid.UUID
    title: str
    body: str
    category: str
    action_type: str | None = None
    action_data: dict[str, Any]
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime

class UnreadCountResponse(BaseModel):
    unread_count: int
