import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.notices.models import Notice, EmergencyContact, SOSEvent
from app.modules.notices.repository import NoticeRepository
from app.modules.notices.events import (
    NOTICE_PUBLISHED,
    SOS_TRIGGERED,
    SOS_RESOLVED,
    EMERGENCY_CONTACT_ADDED,
)
from app.modules.notices.schemas import (
    NoticeCreate,
    EmergencyContactCreate,
    SOSCreate,
)

class NoticeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NoticeRepository(db)

    async def create_notice(
        self, society_id: uuid.UUID, payload: NoticeCreate, author: User
    ) -> Notice:
        await self.repo.ensure_society(society_id)
        notice = Notice(
            society_id=society_id,
            title=payload.title,
            body=payload.body,
            category=payload.category,
            priority=payload.priority,
            image_url=payload.image_url,
            document_url=payload.document_url,
            target_type=payload.target_type,
            target_ids=payload.target_ids,
            expires_at=payload.expires_at,
            send_push=payload.send_push,
            created_by=author.id,
        )
        await self.repo.save(notice)
        
        notice = await self.repo.get_notice_with_author(notice.id)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(author.id),
                event_type=NOTICE_PUBLISHED,
                entity_type="notice",
                entity_id=str(notice.id),
                payload={"title": payload.title, "priority": payload.priority},
            )
        )
        return notice

    async def list_notices(self, society_id: uuid.UUID) -> list[Notice]:
        return await self.repo.list_notices(society_id)

    # Emergency Contacts
    async def add_emergency_contact(
        self, society_id: uuid.UUID, payload: EmergencyContactCreate
    ) -> EmergencyContact:
        contact = EmergencyContact(
            society_id=society_id,
            name=payload.name,
            phone=payload.phone,
            role=payload.role,
            sort_order=payload.sort_order,
        )
        await self.repo.save(contact)
        
        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type=EMERGENCY_CONTACT_ADDED,
                entity_type="emergency_contact",
                entity_id=str(contact.id),
                payload={"name": payload.name},
            )
        )
        return contact

    async def list_emergency_contacts(self, society_id: uuid.UUID) -> list[EmergencyContact]:
        return await self.repo.list_emergency_contacts(society_id)

    # SOS Events
    async def trigger_sos(
        self, society_id: uuid.UUID, payload: SOSCreate, user: User
    ) -> SOSEvent:
        await self.repo.ensure_society(society_id)
        sos = SOSEvent(
            society_id=society_id,
            triggered_by=user.id,
            unit_id=payload.unit_id,
            sos_type=payload.sos_type,
            message=payload.message,
            location=payload.location,
            status="active",
        )
        await self.repo.save(sos)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(user.id),
                event_type=SOS_TRIGGERED,
                entity_type="sos_event",
                entity_id=str(sos.id),
                payload={"sos_type": payload.sos_type, "message": payload.message},
            )
        )
        return sos

    async def resolve_sos(
        self, society_id: uuid.UUID, sos_id: uuid.UUID, resolver: User
    ) -> SOSEvent:
        sos = await self.repo.get_sos_event(society_id, sos_id)
        if not sos:
            raise AppException(code="SOS_NOT_FOUND", message="SOS event not found", status_code=404)

        sos.status = "resolved"
        sos.acknowledged_by = resolver.id
        sos.resolved_at = datetime.now(timezone.utc)
        await self.repo.save(sos)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(resolver.id),
                event_type=SOS_RESOLVED,
                entity_type="sos_event",
                entity_id=str(sos.id),
            )
        )
        return sos
