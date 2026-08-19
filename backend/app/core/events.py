import uuid
from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, Field

class DomainEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    society_id: str | None = None
    actor_user_id: str | None = None
    device_id: str | None = None
    event_type: str
    entity_type: str
    entity_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "api"
    correlation_id: str | None = None
    idempotency_key: str | None = None

class EventBus:
    def __init__(self):
        self._handlers: dict[str, list] = {}

    def subscribe(self, event_type: str, handler):
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def publish(self, event: DomainEvent):
        # Notify subscribers
        handlers = self._handlers.get(event.event_type, [])
        for handler in handlers:
            try:
                await handler(event)
            except Exception as e:
                # Log error without breaking flow
                print(f"Error handling event {event.event_type}: {e}")

event_bus = EventBus()
