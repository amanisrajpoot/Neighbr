import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Any
from app.modules.auth.schemas import UserOut

class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID | None = None
    actor_user_id: uuid.UUID | None = None
    event_type: str
    entity_type: str
    entity_id: str | None = None
    payload: dict[str, Any]
    source: str
    occurred_at: datetime
    created_at: datetime
    actor: UserOut | None = None

class DashboardStatsOut(BaseModel):
    total_units: int
    occupied_units: int
    active_visitors_inside: int
    guards_on_duty: int
    active_notices_count: int
    active_sos_count: int
    total_staff_count: int
