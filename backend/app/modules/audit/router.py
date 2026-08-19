import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.tenancy import require_society_membership, require_roles
from app.modules.audit.schemas import DashboardStatsOut, AuditEventOut
from app.modules.audit.service import AuditService

router = APIRouter(prefix="/societies/{society_id}", tags=["Admin Dashboard & Audit"])

@router.get("/dashboard/stats", response_model=DashboardStatsOut)
@router.get("/audit/dashboard-stats", response_model=DashboardStatsOut)
async def get_dashboard_stats(
    society_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = AuditService(db)
    return await service.get_dashboard_stats(society_id)

@router.get("/audit/events", response_model=list[AuditEventOut])
async def list_audit_events(
    society_id: uuid.UUID,
    limit: int = 100,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = AuditService(db)
    return await service.list_audit_events(society_id, limit=limit)
