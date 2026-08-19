import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.visitors.service import VisitorService
from app.modules.visitors.schemas import GateCheckInRequest, GateCheckOutRequest
from app.modules.gates.service import GateService
from app.modules.gates.schemas import GuardDutyCheckIn, GuardDutyCheckOut
from app.modules.sync.schemas import (
    BatchSyncRequest,
    BatchSyncResponse,
    SyncOperationResult,
)

class SyncService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.visitor_service = VisitorService(db)
        self.gate_service = GateService(db)

    async def process_batch_sync(self, payload: BatchSyncRequest, user: User) -> BatchSyncResponse:
        results: list[SyncOperationResult] = []
        synced_count = 0
        failed_count = 0

        for op in payload.operations:
            try:
                entity_id = None
                if op.operation_type in ("check_in", "walk_in"):
                    gate_id = payload.gate_id or uuid.UUID(op.payload.get("gate_id"))
                    pass_id_str = op.payload.get("pass_id")
                    unit_id_str = op.payload.get("unit_id")
                    
                    check_in_req = GateCheckInRequest(
                        pass_id=uuid.UUID(pass_id_str) if pass_id_str else None,
                        qr_token=op.payload.get("qr_token"),
                        visitor_name=op.payload.get("visitor_name"),
                        visitor_phone=op.payload.get("visitor_phone"),
                        visitor_photo_url=op.payload.get("visitor_photo_url"),
                        unit_id=uuid.UUID(unit_id_str) if unit_id_str else None,
                        vehicle_number=op.payload.get("vehicle_number"),
                        idempotency_key=op.idempotency_key,
                        is_offline=True,
                        device_id=payload.device_id,
                    )
                    event = await self.visitor_service.check_in(
                        payload.society_id, gate_id, check_in_req
                    )
                    entity_id = str(event.id)

                elif op.operation_type == "check_out":
                    gate_id = payload.gate_id or uuid.UUID(op.payload.get("gate_id"))
                    pass_id_str = op.payload.get("pass_id")
                    check_out_req = GateCheckOutRequest(
                        pass_id=uuid.UUID(pass_id_str) if pass_id_str else None,
                        idempotency_key=op.idempotency_key,
                        is_offline=True,
                    )
                    event = await self.visitor_service.check_out(
                        payload.society_id, gate_id, check_out_req
                    )
                    entity_id = str(event.id)

                elif op.operation_type == "guard_check_in":
                    guard_id = uuid.UUID(op.payload.get("guard_id"))
                    gate_id = payload.gate_id or uuid.UUID(op.payload.get("gate_id"))
                    att = await self.gate_service.check_in_duty(
                        payload.society_id,
                        guard_id,
                        GuardDutyCheckIn(gate_id=gate_id, location=op.payload.get("location")),
                    )
                    entity_id = str(att.id)

                elif op.operation_type == "guard_check_out":
                    guard_id = uuid.UUID(op.payload.get("guard_id"))
                    att = await self.gate_service.check_out_duty(
                        payload.society_id,
                        guard_id,
                        GuardDutyCheckOut(location=op.payload.get("location")),
                    )
                    entity_id = str(att.id)

                results.append(
                    SyncOperationResult(
                        operation_id=op.operation_id,
                        idempotency_key=op.idempotency_key,
                        status="SYNCED",
                        entity_id=entity_id,
                    )
                )
                synced_count += 1

            except Exception as e:
                results.append(
                    SyncOperationResult(
                        operation_id=op.operation_id,
                        idempotency_key=op.idempotency_key,
                        status="FAILED",
                        error=str(e),
                    )
                )
                failed_count += 1

        return BatchSyncResponse(
            results=results,
            server_time=datetime.now(timezone.utc),
            synced_count=synced_count,
            failed_count=failed_count,
        )
