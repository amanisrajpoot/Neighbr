import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.middleware.tenancy import verify_society_access
from app.modules.auth.models import User
from app.modules.sync.schemas import (
    BatchSyncRequest,
    BatchSyncResponse,
    SyncOperationItem,
    SyncOperationResult,
)
from app.modules.sync.service import SyncService

router = APIRouter(tags=["Offline Sync"])

@router.post("/sync/batch", response_model=BatchSyncResponse)
async def batch_sync_operations(
    payload: BatchSyncRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_society_access(payload.society_id, user, db)
    service = SyncService(db)
    return await service.process_batch_sync(payload, user)

@router.post("/sync/guard-push")
async def guard_push_single_or_batch(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await request.json()
    idempotency_key = request.headers.get("X-Idempotency-Key", str(uuid.uuid4()))
    service = SyncService(db)
    
    # Handle single operation push from mobile sync engine
    society_id_str = data.get("society_id") or "34090e70-34f9-4cdd-9522-e2098982a5ed"
    society_id = uuid.UUID(society_id_str)
    
    op_item = SyncOperationItem(
        operation_id=data.get("operation_id", str(uuid.uuid4())),
        operation_type=data.get("operation_type", "check_in"),
        entity_type=data.get("entity_type", "visitor"),
        idempotency_key=idempotency_key,
        local_created_at=datetime.now(timezone.utc),
        payload=data.get("payload", {})
    )
    
    batch_req = BatchSyncRequest(
        society_id=society_id,
        device_id=data.get("device_id", "GATE-TERM-01"),
        operations=[op_item]
    )
    
    res = await service.process_batch_sync(batch_req, user)
    return {
        "status": "SYNCED",
        "operation_id": op_item.operation_id,
        "results": [r.model_dump() for r in res.results]
    }

@router.post("/societies/{society_id}/sync/push")
async def society_sync_push(
    society_id: uuid.UUID,
    payload: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SyncService(db)
    mutations = payload.get("mutations", [])
    ops = []
    for m in mutations:
        ops.append(
            SyncOperationItem(
                operation_id=m.get("client_mutation_id", str(uuid.uuid4())),
                operation_type=m.get("operation", "check_in").lower(),
                entity_type=m.get("entity_type", "visitor"),
                idempotency_key=m.get("client_mutation_id", str(uuid.uuid4())),
                local_created_at=datetime.now(timezone.utc),
                payload=m.get("payload", {})
            )
        )
    batch_req = BatchSyncRequest(
        society_id=society_id,
        device_id=payload.get("device_id", "GATE-TERM-01"),
        operations=ops
    )
    res = await service.process_batch_sync(batch_req, user)
    return {
        "status": "SUCCESS",
        "applied": res.synced_count,
        "failed": res.failed_count,
        "results": [r.model_dump() for r in res.results]
    }

@router.get("/societies/{society_id}/sync/pull")
async def society_sync_pull(
    society_id: uuid.UUID,
    since_seq: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {
        "society_id": str(society_id),
        "server_time": datetime.now(timezone.utc).isoformat(),
        "since_seq": since_seq,
        "events": []
    }
