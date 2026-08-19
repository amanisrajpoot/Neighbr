import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.middleware.tenancy import require_society_membership, require_roles
from app.modules.auth.models import User
from app.modules.ai.schemas import (
    AIChatRequest,
    AIChatResponse,
    AIDraftNoticeRequest,
    AIDraftNoticeResponse,
    AISecurityAnomaly,
)
from app.modules.ai.service import AIService

router = APIRouter(prefix="/societies/{society_id}/ai", tags=["Intelligent Society Operations & AI Assistant"])

@router.post("/chat", response_model=AIChatResponse)
async def resident_ai_chat(
    society_id: uuid.UUID,
    payload: AIChatRequest,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = AIService(db)
    return await service.handle_resident_chat(society_id, user, payload)

@router.post("/draft-notice", response_model=AIDraftNoticeResponse)
async def draft_notice_ai(
    society_id: uuid.UUID,
    payload: AIDraftNoticeRequest,
    _auth = Depends(require_roles(["society_admin", "committee", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = AIService(db)
    return await service.draft_notice(society_id, payload)

@router.get("/anomalies", response_model=list[AISecurityAnomaly])
async def get_security_anomalies(
    society_id: uuid.UUID,
    _auth = Depends(require_roles(["society_admin", "guard", "committee", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = AIService(db)
    return await service.get_security_anomalies(society_id)
