import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditEvent
from app.modules.audit.schemas import DashboardStatsOut
from app.modules.audit.repository import AuditRepository

class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AuditRepository(db)

    async def get_dashboard_stats(self, society_id: uuid.UUID) -> DashboardStatsOut:
        total_units = await self.repo.get_total_units(society_id)
        occupied_units = await self.repo.get_occupied_units(society_id)
        visitors_inside = await self.repo.get_visitors_inside(society_id)
        guards_on_duty = await self.repo.get_guards_on_duty(society_id)
        active_notices = await self.repo.get_active_notices(society_id)
        active_sos = await self.repo.get_active_sos(society_id)
        total_staff = await self.repo.get_total_staff(society_id)

        return DashboardStatsOut(
            total_units=total_units,
            occupied_units=occupied_units,
            active_visitors_inside=visitors_inside,
            guards_on_duty=guards_on_duty,
            active_notices_count=active_notices,
            active_sos_count=active_sos,
            total_staff_count=total_staff,
        )

    async def list_audit_events(
        self, society_id: uuid.UUID, limit: int = 100
    ) -> list[AuditEvent]:
        return await self.repo.list_audit_events(society_id, limit)

    async def log(
        self,
        society_id: str | None,
        actor_user_id: str | None,
        event_type: str,
        entity_type: str,
        entity_id: str | None = None,
        payload: dict | None = None,
        device_id: str | None = None,
        source: str = "api",
    ):
        event = AuditEvent(
            society_id=uuid.UUID(society_id) if society_id else None,
            actor_user_id=uuid.UUID(actor_user_id) if actor_user_id else None,
            device_id=device_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload or {},
            occurred_at=datetime.now(timezone.utc),
            source=source,
        )
        await self.repo.save(event)
