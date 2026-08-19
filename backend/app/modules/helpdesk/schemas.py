import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Any

class TicketCreate(BaseModel):
    unit_id: uuid.UUID | None = None
    category: str
    priority: str = "normal"
    title: str
    description: str
    images: list[str] = []

class TicketStatusUpdate(BaseModel):
    status: str
    resolution_notes: str | None = None
    assigned_to: uuid.UUID | None = None

class TicketAssign(BaseModel):
    assigned_to: uuid.UUID

class TicketRate(BaseModel):
    rating: int
    feedback: str | None = None

class CommentCreate(BaseModel):
    message: str
    is_internal: bool = False

class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticket_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str | None = None
    message: str
    is_internal: bool
    created_at: datetime

class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    unit_id: uuid.UUID | None = None
    unit_number: str | None = None
    created_by: uuid.UUID
    creator_name: str | None = None
    assigned_to: uuid.UUID | None = None
    assignee_name: str | None = None
    category: str
    priority: str
    title: str
    description: str
    images: list[str] = []
    status: str
    resolution_notes: str | None = None
    rating: int | None = None
    feedback: str | None = None
    sla_due_at: datetime | None = None
    resolved_at: datetime | None = None
    closed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    comments: list[CommentOut] = []
