import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.events import event_bus, DomainEvent
from app.database import AsyncSessionLocal
from app.modules.societies.models import UnitMembership
from app.modules.notifications.service import NotificationService
from app.modules.notifications.schemas import NotificationCreate
from app.modules.notifications.websocket import manager

async def handle_visitor_checked_in(event: DomainEvent):
    payload = event.payload
    unit_id_str = payload.get("unit_id")
    visitor_name = payload.get("visitor_name", "A visitor")

    if not unit_id_str or not event.society_id:
        return

    async with AsyncSessionLocal() as db:
        try:
            unit_id = uuid.UUID(unit_id_str)
            society_id = uuid.UUID(event.society_id)
            
            # Find all active residents associated with this unit
            res = await db.execute(
                select(UnitMembership.user_id).where(
                    UnitMembership.society_id == society_id,
                    UnitMembership.unit_id == unit_id,
                    UnitMembership.is_active.is_(True),
                )
            )
            user_ids = res.scalars().all()

            service = NotificationService(db)
            
            for u_id in user_ids:
                notif = await service.create_notification(
                    society_id=society_id,
                    payload=NotificationCreate(
                        recipient_user_id=u_id,
                        title="Visitor Arrived",
                        body=f"{visitor_name} has arrived at the gate.",
                        category="visitor",
                        action_type="VISITOR_CHECKED_IN",
                        action_data={"entity_id": event.entity_id}
                    )
                )
                
                # Send real-time websocket message
                await manager.send_json_message(
                    message={
                        "type": "NOTIFICATION",
                        "data": {
                            "id": str(notif.id),
                            "title": notif.title,
                            "body": notif.body,
                            "category": notif.category,
                            "created_at": notif.created_at.isoformat(),
                        }
                    },
                    user_id=u_id
                )
        except Exception as e:
            print(f"Failed to process visitor checked in event: {e}")

async def handle_society_broadcast(event: DomainEvent, category: str, default_title: str, default_body: str):
    payload = event.payload
    title = payload.get("title") or payload.get("sos_type") or default_title
    body = payload.get("body") or payload.get("message") or default_body

    if not event.society_id:
        return

    async with AsyncSessionLocal() as db:
        try:
            society_id = uuid.UUID(event.society_id)
            res = await db.execute(
                select(UnitMembership.user_id).where(
                    UnitMembership.society_id == society_id,
                    UnitMembership.is_active.is_(True),
                )
            )
            # Distinct user IDs
            user_ids = list(set(res.scalars().all()))
            
            service = NotificationService(db)
            for u_id in user_ids:
                notif = await service.create_notification(
                    society_id=society_id,
                    payload=NotificationCreate(
                        recipient_user_id=u_id,
                        title=title,
                        body=body,
                        category=category,
                        action_type=event.event_type,
                        action_data={"entity_id": event.entity_id}
                    )
                )
                
                await manager.send_json_message(
                    message={
                        "type": "NOTIFICATION",
                        "data": {
                            "id": str(notif.id),
                            "title": notif.title,
                            "body": notif.body,
                            "category": notif.category,
                            "created_at": notif.created_at.isoformat(),
                        }
                    },
                    user_id=str(u_id)
                )

            # Also broadcast real-time alert to all connected sockets in the environment
            await manager.broadcast_json(
                message={
                    "type": "NOTIFICATION",
                    "data": {
                        "id": str(uuid.uuid4()),
                        "title": title,
                        "body": body,
                        "category": category,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                }
            )
        except Exception as e:
            print(f"Failed to process broadcast event {event.event_type}: {e}")

async def handle_notice_published(event: DomainEvent):
    await handle_society_broadcast(event, "notice", "New Notice", "A new notice has been published.")

async def handle_sos_triggered(event: DomainEvent):
    await handle_society_broadcast(event, "emergency", "🚨 SOS Alert", "An emergency SOS was triggered!")

def register_subscribers():
    event_bus.subscribe("VISITOR_CHECKED_IN", handle_visitor_checked_in)
    event_bus.subscribe("NOTICE_PUBLISHED", handle_notice_published)
    event_bus.subscribe("SOS_TRIGGERED", handle_sos_triggered)
