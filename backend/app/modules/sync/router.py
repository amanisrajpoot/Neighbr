from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.middleware.tenancy import verify_society_access
from app.modules.auth.models import User
from app.modules.sync.schemas import BatchSyncRequest, BatchSyncResponse
from app.modules.sync.service import SyncService

router = APIRouter(prefix="/sync", tags=["Offline Sync"])

@router.post("/batch", response_model=BatchSyncResponse)
async def batch_sync_operations(
    payload: BatchSyncRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_society_access(payload.society_id, user, db)
    service = SyncService(db)
    return await service.process_batch_sync(payload, user)
