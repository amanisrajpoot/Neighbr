import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.events import event_bus, DomainEvent
import app.database as db_module
from app.modules.societies.models import UnitMembership
from app.modules.notifications.service import NotificationService
from app.modules.notifications.schemas import NotificationCreate
from app.modules.notifications.websocket import manager
from app.modules.notifications.push_service import push_service

async def handle_visitor_checked_in(event: DomainEvent):
    payload = event.payload
    unit_id_str = payload.get("unit_id")
    visitor_name = payload.get("visitor_name", "A visitor")

    if not unit_id_str or not event.society_id:
        return

    async with db_module.AsyncSessionLocal() as db:
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

            # Dispatch native push notifications to residents' devices
            if user_ids:
                await push_service.dispatch_push_to_users(
                    db=db,
                    user_ids=user_ids,
                    title="Visitor Arrived 🚪",
                    body=f"{visitor_name} has checked in at the gate.",
                    category="visitor",
                    data={"entity_id": event.entity_id, "action": "VISITOR_CHECKED_IN"},
                )
        except Exception as e:
            print(f"Failed to process visitor checked in event: {e}")

async def handle_society_broadcast(event: DomainEvent, category: str, default_title: str, default_body: str):
    payload = event.payload
    title = payload.get("title") or payload.get("sos_type") or default_title
    body = payload.get("body") or payload.get("message") or default_body

    if not event.society_id:
        return

    async with db_module.AsyncSessionLocal() as db:
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

            # Dispatch push notifications to all society members
            if user_ids:
                await push_service.dispatch_push_to_users(
                    db=db,
                    user_ids=user_ids,
                    title=f"🚨 {title}" if category in ("security", "emergency") else f"📢 {title}",
                    body=body,
                    category=category,
                    priority="high" if category in ("security", "emergency") else "default",
                    data={"entity_id": event.entity_id, "action": event.event_type},
                )
        except Exception as e:
            print(f"Failed to process broadcast event {event.event_type}: {e}")

async def handle_visitor_approval_request(event: DomainEvent):
    payload = event.payload
    unit_id_str = payload.get("unit_id")
    visitor_name = payload.get("visitor_name", "A visitor")

    if not unit_id_str or not event.society_id:
        return

    async with db_module.AsyncSessionLocal() as db:
        try:
            unit_id = uuid.UUID(unit_id_str)
            society_id = uuid.UUID(event.society_id)

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
                        title="🔔 Gate Approval Request",
                        body=f"{visitor_name} is requesting entry to your flat.",
                        category="visitor",
                        action_type="VISITOR_APPROVAL_REQUEST",
                        action_data={"pass_id": event.entity_id, "visitor_name": visitor_name}
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
                            "action_type": notif.action_type,
                            "action_data": notif.action_data,
                            "created_at": notif.created_at.isoformat(),
                        }
                    },
                    user_id=str(u_id)
                )

            # Dispatch priority push notifications to resident devices
            if user_ids:
                await push_service.dispatch_push_to_users(
                    db=db,
                    user_ids=user_ids,
                    title="🔔 Visitor at Gate",
                    body=f"{visitor_name} is requesting entry to your flat. Tap to approve or decline.",
                    category="visitor",
                    priority="high",
                    data={
                        "pass_id": event.entity_id,
                        "visitor_name": visitor_name,
                        "action": "VISITOR_APPROVAL_REQUEST",
                    },
                )
        except Exception as e:
            print(f"Failed to process visitor approval request event: {e}")

async def handle_notice_published(event: DomainEvent):
    await handle_society_broadcast(event, "notice", "New Notice", "A new notice has been published.")

async def handle_sos_triggered(event: DomainEvent):
    await handle_society_broadcast(event, "emergency", "🚨 SOS Alert", "An emergency SOS was triggered!")

def register_subscribers():
    event_bus.subscribe("VISITOR_CHECKED_IN", handle_visitor_checked_in)
    event_bus.subscribe("VISITOR_APPROVAL_REQUEST", handle_visitor_approval_request)
    event_bus.subscribe("NOTICE_PUBLISHED", handle_notice_published)
    event_bus.subscribe("SOS_TRIGGERED", handle_sos_triggered)
