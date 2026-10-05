import logging
from app.core.events import event_bus, DomainEvent
import app.database as db_module
from app.modules.audit.service import AuditService

logger = logging.getLogger(__name__)

async def handle_audit_domain_event(event: DomainEvent):
    """
    Subscribes to all domain events published across the application
    and persists an immutable record into the audit_events table.
    """
    try:
        async with db_module.AsyncSessionLocal() as session:
            service = AuditService(session)
            await service.log(
                society_id=event.society_id,
                actor_user_id=event.actor_user_id,
                event_type=event.event_type,
                entity_type=event.entity_type,
                entity_id=event.entity_id,
                payload=event.payload,
                device_id=event.device_id,
                source=event.source,
            )
    except Exception as e:
        logger.error(f"Failed to persist audit event for {event.event_type}: {e}", exc_info=True)

def register_audit_subscribers():
    event_bus.subscribe_all(handle_audit_domain_event)
