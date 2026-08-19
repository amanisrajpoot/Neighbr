import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.societies.models import Unit, Society
from app.modules.visitors.models import VisitorPass
from app.modules.gates.models import GuardAttendance
from app.modules.notices.models import Notice, SOSEvent
from app.modules.staff.models import StaffProfile
from app.modules.audit.models import AuditEvent
from app.modules.audit.schemas import DashboardStatsOut

class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_stats(self, society_id: uuid.UUID) -> DashboardStatsOut:
        # Total units
        total_units_res = await self.db.execute(
            select(func.count(Unit.id)).where(Unit.society_id == society_id, Unit.is_active.is_(True))
        )
        total_units = total_units_res.scalar_one() or 0

        # Occupied units
        occupied_units_res = await self.db.execute(
            select(func.count(Unit.id)).where(
                Unit.society_id == society_id, Unit.is_occupied.is_(True), Unit.is_active.is_(True)
            )
        )
        occupied_units = occupied_units_res.scalar_one() or 0

        # Visitors inside
        visitors_inside_res = await self.db.execute(
            select(func.count(VisitorPass.id)).where(
                VisitorPass.society_id == society_id, VisitorPass.status == "CHECKED_IN"
            )
        )
        visitors_inside = visitors_inside_res.scalar_one() or 0

        # Guards on duty
        guards_duty_res = await self.db.execute(
            select(func.count(GuardAttendance.id)).where(
                GuardAttendance.society_id == society_id, GuardAttendance.status == "on_duty"
            )
        )
        guards_on_duty = guards_duty_res.scalar_one() or 0

        # Active notices
        notices_res = await self.db.execute(
            select(func.count(Notice.id)).where(
                Notice.society_id == society_id, Notice.is_active.is_(True)
            )
        )
        active_notices = notices_res.scalar_one() or 0

        # Active SOS
        sos_res = await self.db.execute(
            select(func.count(SOSEvent.id)).where(
                SOSEvent.society_id == society_id, SOSEvent.status == "active"
            )
        )
        active_sos = sos_res.scalar_one() or 0

        # Total staff
        staff_res = await self.db.execute(
            select(func.count(StaffProfile.id)).where(
                StaffProfile.society_id == society_id, StaffProfile.is_active.is_(True)
            )
        )
        total_staff = staff_res.scalar_one() or 0

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
        result = await self.db.execute(
            select(AuditEvent)
            .where(AuditEvent.society_id == society_id)
            .order_by(AuditEvent.occurred_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
