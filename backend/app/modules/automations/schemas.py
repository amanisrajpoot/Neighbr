import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Any

class RuleCreate(BaseModel):
    name: str
    description: str | None = None
    trigger_event: str
    conditions: dict[str, Any] = {}
    action_type: str
    action_payload: dict[str, Any] = {}
    is_active: bool = True

class RuleToggleRequest(BaseModel):
    is_active: bool

class AutomationRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    name: str
    description: str | None = None
    trigger_event: str
    conditions: dict[str, Any] = {}
    action_type: str
    action_payload: dict[str, Any] = {}
    is_active: bool
    created_at: datetime
