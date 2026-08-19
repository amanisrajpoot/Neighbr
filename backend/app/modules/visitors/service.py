import hashlib
import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.visitors.models import VisitorProfile, VisitorPass, VisitorEvent, Blacklist
from app.modules.visitors.schemas import (
    CreateVisitorPassRequest,
    GateCheckInRequest,
    GateCheckOutRequest,
    BlacklistCreate,
)

def _ensure_tz_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

def _generate_qr_token(pass_id: uuid.UUID, secret: str) -> str:
    random_part = secrets.token_urlsafe(16)
    signature = hashlib.sha256(f"{pass_id}:{random_part}:{secret}".encode()).hexdigest()[:12]
    return f"NBR-{random_part}-{signature}"

class VisitorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_pass(
        self, society_id: uuid.UUID, payload: CreateVisitorPassRequest, issuer: User
    ) -> VisitorPass:
        pass_id = uuid.uuid4()
        qr_token = _generate_qr_token(pass_id, str(society_id))

        visitor_profile = None
        if payload.visitor_phone:
            res = await self.db.execute(
                select(VisitorProfile).where(VisitorProfile.phone == payload.visitor_phone.strip())
            )
            visitor_profile = res.scalar_one_or_none()
            if not visitor_profile:
                visitor_profile = VisitorProfile(
                    phone=payload.visitor_phone.strip(),
                    name=payload.visitor_name,
                    company=payload.visitor_company,
                )
                self.db.add(visitor_profile)
                await self.db.flush()

        visitor_pass = VisitorPass(
            id=pass_id,
            society_id=society_id,
            unit_id=payload.unit_id,
            visitor_id=visitor_profile.id if visitor_profile else None,
            issued_by=issuer.id,
            pass_type=payload.pass_type,
            visitor_name=payload.visitor_name,
            visitor_phone=payload.visitor_phone,
            visitor_company=payload.visitor_company,
            purpose=payload.purpose,
            vehicle_number=payload.vehicle_number,
            gate_restriction=payload.gate_restriction,
            qr_token=qr_token,
            valid_from=payload.valid_from,
            valid_until=payload.valid_until,
            is_recurring=payload.is_recurring,
            status="APPROVED",
            notes=payload.notes,
        )
        self.db.add(visitor_pass)
        await self.db.commit()

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(issuer.id),
                event_type="PASS_CREATED",
                entity_type="visitor_pass",
                entity_id=str(visitor_pass.id),
                payload={"visitor_name": payload.visitor_name, "pass_type": payload.pass_type},
            )
        )

        res = await self.db.execute(
            select(VisitorPass)
            .where(VisitorPass.id == pass_id)
            .options(selectinload(VisitorPass.unit), selectinload(VisitorPass.issuer))
        )
        return res.scalar_one()

    async def list_passes(
        self, society_id: uuid.UUID, unit_id: uuid.UUID | None = None, user_id: uuid.UUID | None = None
    ) -> list[VisitorPass]:
        query = select(VisitorPass).where(VisitorPass.society_id == society_id).options(
            selectinload(VisitorPass.unit), selectinload(VisitorPass.issuer)
        )
        if unit_id:
            query = query.where(VisitorPass.unit_id == unit_id)
        if user_id:
            query = query.where(VisitorPass.issued_by == user_id)
        query = query.order_by(VisitorPass.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def scan_pass(self, society_id: uuid.UUID, qr_token: str, gate_id: uuid.UUID | None = None) -> VisitorPass:
        result = await self.db.execute(
            select(VisitorPass)
            .where(VisitorPass.qr_token == qr_token.strip(), VisitorPass.society_id == society_id)
            .options(selectinload(VisitorPass.unit), selectinload(VisitorPass.issuer))
        )
        visitor_pass = result.scalar_one_or_none()
        if not visitor_pass:
            raise AppException(code="PASS_NOT_FOUND", message="Invalid QR pass code", status_code=404)

        now = datetime.now(timezone.utc)
        valid_until = _ensure_tz_aware(visitor_pass.valid_until)
        valid_from = _ensure_tz_aware(visitor_pass.valid_from)

        if valid_until < now:
            visitor_pass.status = "EXPIRED"
            await self.db.commit()
            raise AppException(code="PASS_EXPIRED", message="This visitor pass has expired", status_code=400)

        if valid_from > now:
            raise AppException(code="PASS_NOT_YET_VALID", message="This pass is not valid yet", status_code=400)

        if visitor_pass.gate_restriction and gate_id and visitor_pass.gate_restriction != gate_id:
            raise AppException(code="GATE_RESTRICTED", message="This pass is restricted to a different gate", status_code=403)

        # Check blacklist
        if visitor_pass.visitor_phone:
            bl_res = await self.db.execute(
                select(Blacklist).where(
                    Blacklist.society_id == society_id,
                    Blacklist.entity_value == visitor_pass.visitor_phone,
                    Blacklist.is_active.is_(True),
                )
            )
            if bl_res.scalar_one_or_none():
                raise AppException(code="VISITOR_BLACKLISTED", message="This visitor phone is on the society blacklist", status_code=403)

        return visitor_pass

    async def check_in(
        self, society_id: uuid.UUID, gate_id: uuid.UUID, payload: GateCheckInRequest, guard_id: uuid.UUID | None = None
    ) -> VisitorEvent:
        existing_event = await self.db.execute(
            select(VisitorEvent).where(VisitorEvent.idempotency_key == payload.idempotency_key)
        )
        evt = existing_event.scalar_one_or_none()
        if evt:
            return evt

        visitor_pass = None
        if payload.qr_token:
            visitor_pass = await self.scan_pass(society_id, payload.qr_token, gate_id)
        elif payload.pass_id:
            pass_res = await self.db.execute(
                select(VisitorPass).where(VisitorPass.id == payload.pass_id, VisitorPass.society_id == society_id)
            )
            visitor_pass = pass_res.scalar_one_or_none()

        visitor_name = payload.visitor_name or (visitor_pass.visitor_name if visitor_pass else "Guest")
        visitor_phone = payload.visitor_phone or (visitor_pass.visitor_phone if visitor_pass else None)
        unit_id = payload.unit_id or (visitor_pass.unit_id if visitor_pass else None)
        vehicle_number = payload.vehicle_number or (visitor_pass.vehicle_number if visitor_pass else None)

        event = VisitorEvent(
            society_id=society_id,
            pass_id=visitor_pass.id if visitor_pass else None,
            unit_id=unit_id,
            gate_id=gate_id,
            guard_id=guard_id,
            event_type="CHECKED_IN",
            visitor_name=visitor_name,
            visitor_phone=visitor_phone,
            visitor_photo_url=payload.visitor_photo_url,
            vehicle_number=vehicle_number,
            entry_method="qr" if payload.qr_token else "manual",
            is_offline=payload.is_offline,
            idempotency_key=payload.idempotency_key,
        )
        self.db.add(event)

        if visitor_pass:
            visitor_pass.status = "CHECKED_IN"

        await self.db.commit()
        await self.db.refresh(event)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type="VISITOR_CHECKED_IN",
                entity_type="visitor_event",
                entity_id=str(event.id),
                payload={"visitor_name": visitor_name, "unit_id": str(unit_id)},
            )
        )
        return event

    async def check_out(
        self, society_id: uuid.UUID, gate_id: uuid.UUID, payload: GateCheckOutRequest, guard_id: uuid.UUID | None = None
    ) -> VisitorEvent:
        existing_event = await self.db.execute(
            select(VisitorEvent).where(VisitorEvent.idempotency_key == payload.idempotency_key)
        )
        evt = existing_event.scalar_one_or_none()
        if evt:
            return evt

        visitor_pass = None
        if payload.pass_id:
            pass_res = await self.db.execute(
                select(VisitorPass).where(VisitorPass.id == payload.pass_id, VisitorPass.society_id == society_id)
            )
            visitor_pass = pass_res.scalar_one_or_none()

        event = VisitorEvent(
            society_id=society_id,
            pass_id=visitor_pass.id if visitor_pass else None,
            gate_id=gate_id,
            guard_id=guard_id,
            event_type="CHECKED_OUT",
            visitor_name=visitor_pass.visitor_name if visitor_pass else "Guest",
            is_offline=payload.is_offline,
            idempotency_key=payload.idempotency_key,
        )
        self.db.add(event)

        if visitor_pass:
            visitor_pass.status = "CHECKED_OUT"

        await self.db.commit()
        await self.db.refresh(event)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type="VISITOR_CHECKED_OUT",
                entity_type="visitor_event",
                entity_id=str(event.id),
            )
        )
        return event

    async def list_inside_visitors(self, society_id: uuid.UUID) -> list[VisitorPass]:
        result = await self.db.execute(
            select(VisitorPass).where(VisitorPass.society_id == society_id, VisitorPass.status == "CHECKED_IN")
        )
        return list(result.scalars().all())

    async def add_blacklist(self, society_id: uuid.UUID, payload: BlacklistCreate, actor: User) -> Blacklist:
        item = Blacklist(
            society_id=society_id,
            entity_type=payload.entity_type,
            entity_value=payload.entity_value.strip(),
            reason=payload.reason,
            added_by=actor.id,
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def list_blacklists(self, society_id: uuid.UUID) -> list[Blacklist]:
        result = await self.db.execute(
            select(Blacklist).where(Blacklist.society_id == society_id, Blacklist.is_active.is_(True))
        )
        return list(result.scalars().all())
