import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Any

class SyncOperationItem(BaseModel):
    operation_id: str
    operation_type: str  # check_in, check_out, walk_in, guard_check_in, guard_check_out
    entity_type: str
    idempotency_key: str
    local_created_at: datetime
    payload: dict[str, Any]

class BatchSyncRequest(BaseModel):
    society_id: uuid.UUID
    device_id: str
    gate_id: uuid.UUID | None = None
    operations: list[SyncOperationItem]

class SyncOperationResult(BaseModel):
    operation_id: str
    idempotency_key: str
    status: str  # SYNCED, FAILED, CONFLICT
    error: str | None = None
    entity_id: str | None = None

class BatchSyncResponse(BaseModel):
    results: list[SyncOperationResult]
    server_time: datetime
    synced_count: int
    failed_count: int
