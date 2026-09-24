import hashlib
import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.societies.models import UnitMembership, Unit
from app.modules.gates.models import Gate
from app.modules.visitors.models import VisitorProfile, VisitorPass, VisitorEvent, Blacklist
from app.modules.visitors.repository import VisitorRepository
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
        self.repo = VisitorRepository(db)

    async def create_pass(
        self, society_id: uuid.UUID, payload: CreateVisitorPassRequest, issuer: User
    ) -> VisitorPass:
        pass_id = uuid.uuid4()
        type_str = (payload.visitor_type or payload.pass_type or "guest").upper()
        if "GUEST" in type_str:
            prefix = "GST"
        elif "DELIV" in type_str:
            prefix = "DEL"
        elif "CAB" in type_str:
            prefix = "CAB"
        elif "SERV" in type_str:
            prefix = "SVC"
        else:
            prefix = type_str[:3]
        pass_code = f"{prefix}-{secrets.randbelow(9000) + 1000}"
        qr_token = _generate_qr_token(pass_id, str(society_id))

        visitor_profile = None
        if payload.visitor_phone:
            visitor_profile = await self.repo.get_visitor_profile_by_phone(payload.visitor_phone.strip())
            
            if not visitor_profile:
                visitor_profile = VisitorProfile(
                    phone=payload.visitor_phone.strip(),
                    name=payload.visitor_name,
                    company=payload.visitor_company,
                )
                await self.repo.flush(visitor_profile)

        # Safely resolve target unit to prevent foreign key violation
        target_unit_id = payload.unit_id
        target_unit = await self.db.get(Unit, target_unit_id) if target_unit_id else None

        if not target_unit or target_unit.society_id != society_id:
            user_unit_res = await self.db.execute(
                select(UnitMembership.unit_id).where(
                    UnitMembership.society_id == society_id,
                    UnitMembership.user_id == issuer.id,
                    UnitMembership.is_active.is_(True),
                    UnitMembership.unit_id.is_not(None)
                ).limit(1)
            )
            fallback_unit_id = user_unit_res.scalar_one_or_none()
            if fallback_unit_id:
                target_unit_id = fallback_unit_id
            else:
                first_unit_res = await self.db.execute(
                    select(Unit.id).where(Unit.society_id == society_id, Unit.is_active.is_(True)).limit(1)
                )
                target_unit_id = first_unit_res.scalar_one_or_none()
                if not target_unit_id:
                    raise AppException(code="UNIT_NOT_FOUND", message="Valid unit not found for this society", status_code=400)

        # Check if issuer is a guard
        res = await self.db.execute(
            select(UnitMembership).where(
                UnitMembership.society_id == society_id,
                UnitMembership.user_id == issuer.id,
                UnitMembership.is_active.is_(True)
            )
        )
        memberships = res.scalars().all()
        is_guard = any(m.role and m.role.code == "guard" for m in memberships)

        # Default state based on issuer
        initial_status = "APPROVAL_PENDING" if is_guard else "APPROVED"

        visitor_pass = VisitorPass(
            id=pass_id,
            society_id=society_id,
            unit_id=target_unit_id,
            visitor_id=visitor_profile.id if visitor_profile else None,
            issued_by=issuer.id,
            pass_type=payload.pass_type,
            visitor_name=payload.visitor_name,
            visitor_phone=payload.visitor_phone,
            visitor_company=payload.visitor_company,
            purpose=payload.purpose,
            vehicle_number=payload.vehicle_number,
            gate_restriction=payload.gate_restriction,
            pass_code=pass_code,
            qr_token=qr_token,
            valid_from=payload.valid_from,
            valid_until=payload.valid_until,
            is_recurring=payload.is_recurring,
            status=initial_status,
            notes=payload.notes,
        )
        await self.repo.save(visitor_pass)

        # Publish the correct event based on status
        event_type = "VISITOR_APPROVAL_REQUEST" if initial_status == "APPROVAL_PENDING" else "PASS_CREATED"
        
        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(issuer.id),
                event_type=event_type,
                entity_type="visitor_pass",
                entity_id=str(visitor_pass.id),
                payload={"visitor_name": payload.visitor_name, "pass_type": payload.pass_type, "pass_code": pass_code, "unit_id": str(payload.unit_id)},
            )
        )

        return await self.repo.get_pass_with_relations(pass_id)

    async def list_passes(
        self, society_id: uuid.UUID, unit_id: uuid.UUID | None = None, user_id: uuid.UUID | None = None
    ) -> list[VisitorPass]:
        return await self.repo.list_passes(society_id, unit_id, user_id)

    async def approve_pass(self, society_id: uuid.UUID, pass_id: uuid.UUID, actor: User) -> VisitorPass:
        visitor_pass = await self.repo.get_pass_by_id_and_society(pass_id, society_id)
        if not visitor_pass:
            raise AppException(code="PASS_NOT_FOUND", message="Pass not found", status_code=404)
        if visitor_pass.status != "APPROVAL_PENDING":
            raise AppException(code="INVALID_STATE", message=f"Pass is not pending approval (current: {visitor_pass.status})", status_code=400)
        
        visitor_pass.status = "APPROVED"
        await self.repo.save(visitor_pass)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(actor.id),
                event_type="PASS_APPROVED",
                entity_type="visitor_pass",
                entity_id=str(visitor_pass.id),
            )
        )
        return visitor_pass

    async def reject_pass(self, society_id: uuid.UUID, pass_id: uuid.UUID, actor: User) -> VisitorPass:
        visitor_pass = await self.repo.get_pass_by_id_and_society(pass_id, society_id)
        if not visitor_pass:
            raise AppException(code="PASS_NOT_FOUND", message="Pass not found", status_code=404)
        if visitor_pass.status != "APPROVAL_PENDING":
            raise AppException(code="INVALID_STATE", message=f"Pass is not pending approval (current: {visitor_pass.status})", status_code=400)
        
        visitor_pass.status = "REJECTED"
        await self.repo.save(visitor_pass)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(actor.id),
                event_type="PASS_REJECTED",
                entity_type="visitor_pass",
                entity_id=str(visitor_pass.id),
            )
        )
        return visitor_pass

    async def revoke_pass(self, society_id: uuid.UUID, pass_id: uuid.UUID, actor: User) -> VisitorPass:
        visitor_pass = await self.repo.get_pass_by_id_and_society(pass_id, society_id)
        if not visitor_pass:
            raise AppException(code="PASS_NOT_FOUND", message="Pass not found", status_code=404)
        if visitor_pass.status in ("CHECKED_IN", "EXPIRED", "CANCELLED", "REJECTED"):
            raise AppException(code="INVALID_STATE", message=f"Cannot revoke pass in state: {visitor_pass.status}", status_code=400)
        
        visitor_pass.status = "CANCELLED"
        visitor_pass.revoked_at = datetime.now(timezone.utc)
        visitor_pass.revoked_by = actor.id
        await self.repo.save(visitor_pass)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(actor.id),
                event_type="PASS_REVOKED",
                entity_type="visitor_pass",
                entity_id=str(visitor_pass.id),
            )
        )
        return visitor_pass

    async def scan_pass(
        self, society_id: uuid.UUID, qr_token: str | None = None, pin_code: str | None = None, gate_id: uuid.UUID | None = None
    ) -> VisitorPass:
        if not qr_token and not pin_code:
            raise AppException(code="INVALID_PASS_QUERY", message="QR token or 6-digit PIN code required", status_code=400)

        if qr_token and qr_token.strip().startswith("AMN-"):
            ab = await self.repo.get_amenity_booking_by_qr(society_id, qr_token.strip())
            
            if not ab:
                raise AppException(code="AMENITY_PASS_NOT_FOUND", message="Clubhouse Amenity pass not found", status_code=404)
            if ab.status == "CANCELLED":
                raise AppException(code="PASS_CANCELLED", message="Clubhouse booking was cancelled", status_code=400)
                
            return VisitorPass(
                id=ab.id,
                society_id=ab.society_id,
                unit_id=ab.unit_id,
                pass_type="clubhouse",
                visitor_name=f"{ab.user.full_name if ab.user else 'Resident'} ({ab.amenity.name if ab.amenity else 'Amenity'})",
                visitor_phone=ab.user.phone if ab.user else "",
                qr_token=ab.qr_pass,
                valid_from=datetime.combine(ab.booking_date, datetime.min.time(), tzinfo=timezone.utc),
                valid_until=datetime.combine(ab.booking_date, datetime.max.time(), tzinfo=timezone.utc),
                status=ab.status,
                unit=ab.unit,
                issuer=ab.user,
            )

        visitor_pass = await self.repo.get_pass_by_qr_or_pin(society_id, qr_token=qr_token, pin_code=pin_code)
        
        if not visitor_pass:
            raise AppException(
                code="PASS_NOT_FOUND",
                message=f"No active pass found matching {'PIN: ' + pin_code if pin_code else 'QR Token'}",
                status_code=404
            )

        now = datetime.now(timezone.utc)
        valid_until = _ensure_tz_aware(visitor_pass.valid_until)
        valid_from = _ensure_tz_aware(visitor_pass.valid_from)

        if valid_until < now:
            visitor_pass.status = "EXPIRED"
            await self.repo.save(visitor_pass)
            raise AppException(
                code="PASS_EXPIRED",
                message=f"This visitor pass expired on {valid_until.strftime('%d %b %Y, %I:%M %p')}",
                status_code=400
            )

        if valid_from > now:
            raise AppException(
                code="PASS_NOT_YET_VALID",
                message=f"This pass is not valid yet (valid from {valid_from.strftime('%d %b %Y, %I:%M %p')})",
                status_code=400
            )

        if visitor_pass.status in ("CANCELLED", "REJECTED"):
            raise AppException(
                code="PASS_REVOKED",
                message=f"This pass was {visitor_pass.status.lower()} by the resident or estate security",
                status_code=400
            )

        if visitor_pass.status == "APPROVAL_PENDING":
            raise AppException(
                code="PASS_PENDING",
                message="This pass is pending approval from the resident",
                status_code=400
            )

        if visitor_pass.gate_restriction and gate_id and visitor_pass.gate_restriction != gate_id:
            raise AppException(code="GATE_RESTRICTED", message="This pass is restricted to a different gate checkpoint", status_code=403)

        # Check blacklist for phone
        if visitor_pass.visitor_phone:
            if await self.repo.is_blacklisted(society_id, visitor_pass.visitor_phone):
                raise AppException(code="VISITOR_BLACKLISTED", message="This visitor phone is on the security blacklist", status_code=403)

        # Check blacklist for vehicle
        if visitor_pass.vehicle_number:
            if await self.repo.is_blacklisted(society_id, visitor_pass.vehicle_number.strip().upper()):
                raise AppException(code="VEHICLE_BLACKLISTED", message="This vehicle license plate is on the security blacklist", status_code=403)

        return visitor_pass

    async def check_in(
        self, society_id: uuid.UUID, gate_id: uuid.UUID, payload: GateCheckInRequest, guard_id: uuid.UUID | None = None
    ) -> VisitorEvent:
        evt = await self.repo.get_event_by_idempotency_key(payload.idempotency_key)
        if evt:
            return evt

        # Ensure gate_id exists in society, otherwise fallback to first active gate
        target_gate = await self.db.get(Gate, gate_id) if gate_id else None
        if not target_gate or target_gate.society_id != society_id:
            gate_res = await self.db.execute(
                select(Gate.id).where(Gate.society_id == society_id, Gate.is_active.is_(True)).limit(1)
            )
            fallback_gate = gate_res.scalar_one_or_none()
            if fallback_gate:
                gate_id = fallback_gate

        visitor_pass = None
        if payload.qr_token:
            visitor_pass = await self.scan_pass(society_id, payload.qr_token, gate_id)
        elif payload.pass_id:
            visitor_pass = await self.repo.get_pass_by_id_and_society(payload.pass_id, society_id)

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

        if visitor_pass:
            if visitor_pass.status != "APPROVED":
                raise AppException(code="INVALID_STATE", message="Pass must be APPROVED before check-in", status_code=400)
            visitor_pass.status = "CHECKED_IN"
            self.db.add(visitor_pass)

        await self.repo.save(event)

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
        evt = await self.repo.get_event_by_idempotency_key(payload.idempotency_key)
        if evt:
            return evt

        # Ensure gate_id exists in society, otherwise fallback to first active gate
        target_gate = await self.db.get(Gate, gate_id) if gate_id else None
        if not target_gate or target_gate.society_id != society_id:
            gate_res = await self.db.execute(
                select(Gate.id).where(Gate.society_id == society_id, Gate.is_active.is_(True)).limit(1)
            )
            fallback_gate = gate_res.scalar_one_or_none()
            if fallback_gate:
                gate_id = fallback_gate

        visitor_pass = None
        if payload.pass_id:
            visitor_pass = await self.repo.get_pass_by_id_and_society(payload.pass_id, society_id)

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

        if visitor_pass:
            if visitor_pass.status != "CHECKED_IN":
                raise AppException(code="INVALID_STATE", message="Pass must be CHECKED_IN before check-out", status_code=400)
            visitor_pass.status = "CHECKED_OUT"
            self.db.add(visitor_pass)

        await self.repo.save(event)

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
        return await self.repo.get_passes_by_status(society_id, "CHECKED_IN")

    async def add_blacklist(self, society_id: uuid.UUID, payload: BlacklistCreate, actor: User) -> Blacklist:
        item = Blacklist(
            society_id=society_id,
            entity_type=payload.entity_type,
            entity_value=payload.entity_value.strip(),
            reason=payload.reason,
            added_by=actor.id,
        )
        await self.repo.save(item)
        return item

    async def list_blacklists(self, society_id: uuid.UUID) -> list[Blacklist]:
        return await self.repo.list_active_blacklists(society_id)
