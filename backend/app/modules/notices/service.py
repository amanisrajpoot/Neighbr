import uuid
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.societies.models import Society
from app.modules.notices.models import Notice, EmergencyContact, SOSEvent
from app.modules.notices.schemas import (
    NoticeCreate,
    EmergencyContactCreate,
    SOSCreate,
)

class NoticeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _ensure_society(self, society_id: uuid.UUID):
        soc_res = await self.db.execute(select(Society).where(Society.id == society_id))
        society = soc_res.scalar_one_or_none()
        if not society:
            society = Society(
                id=society_id,
                name="Greenwood Palms Heights",
                slug=f"greenwood-{str(society_id)[:8]}",
                city="Bengaluru",
                state="Karnataka",
                pincode="560066",
            )
            self.db.add(society)
            await self.db.flush()

    async def create_notice(
        self, society_id: uuid.UUID, payload: NoticeCreate, author: User
    ) -> Notice:
        await self._ensure_society(society_id)
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
        self.db.add(notice)
        await self.db.commit()
        
        res = await self.db.execute(
            select(Notice).where(Notice.id == notice.id).options(selectinload(Notice.author))
        )
        notice = res.scalar_one()

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(author.id),
                event_type="NOTICE_PUBLISHED",
                entity_type="notice",
                entity_id=str(notice.id),
                payload={"title": payload.title, "priority": payload.priority},
            )
        )
        return notice

    async def list_notices(self, society_id: uuid.UUID) -> list[Notice]:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Notice)
            .where(
                Notice.society_id == society_id,
                Notice.is_active.is_(True),
            )
            .options(selectinload(Notice.author))
            .order_by(Notice.created_at.desc())
        )
        return list(result.scalars().all())

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
        self.db.add(contact)
        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def list_emergency_contacts(self, society_id: uuid.UUID) -> list[EmergencyContact]:
        result = await self.db.execute(
            select(EmergencyContact)
            .where(EmergencyContact.society_id == society_id, EmergencyContact.is_active.is_(True))
            .order_by(EmergencyContact.sort_order, EmergencyContact.name)
        )
        return list(result.scalars().all())

    # SOS Events
    async def trigger_sos(
        self, society_id: uuid.UUID, payload: SOSCreate, user: User
    ) -> SOSEvent:
        await self._ensure_society(society_id)
        sos = SOSEvent(
            society_id=society_id,
            triggered_by=user.id,
            unit_id=payload.unit_id,
            sos_type=payload.sos_type,
            message=payload.message,
            location=payload.location,
            status="active",
        )
        self.db.add(sos)
        await self.db.commit()
        await self.db.refresh(sos)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(user.id),
                event_type="SOS_TRIGGERED",
                entity_type="sos_event",
                entity_id=str(sos.id),
                payload={"sos_type": payload.sos_type, "message": payload.message},
            )
        )
        return sos

    async def resolve_sos(
        self, society_id: uuid.UUID, sos_id: uuid.UUID, resolver: User
    ) -> SOSEvent:
        result = await self.db.execute(
            select(SOSEvent).where(SOSEvent.id == sos_id, SOSEvent.society_id == society_id)
        )
        sos = result.scalar_one_or_none()
        if not sos:
            raise AppException(code="SOS_NOT_FOUND", message="SOS event not found", status_code=404)

        sos.status = "resolved"
        sos.acknowledged_by = resolver.id
        sos.resolved_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(sos)
        return sos
