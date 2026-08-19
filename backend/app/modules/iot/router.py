import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.tenancy import require_society_membership, require_roles
from app.modules.iot.schemas import DeviceCreate, ExecuteCommandRequest, IoTDeviceOut, CommandLogOut
from app.modules.iot.service import IoTService

router = APIRouter(prefix="/societies/{society_id}/iot", tags=["IoT Hardware & Gate Automation"])

def _format_device(d) -> IoTDeviceOut:
    return IoTDeviceOut(
        id=d.id,
        society_id=d.society_id,
        gate_id=d.gate_id,
        name=d.name,
        device_type=d.device_type,
        ip_address=d.ip_address,
        mac_address=d.mac_address,
        status=d.status,
        firmware_version=d.firmware_version,
        last_heartbeat_at=d.last_heartbeat_at,
        created_at=d.created_at,
        commands=[
            CommandLogOut(
                id=c.id,
                device_id=c.device_id,
                command=c.command,
                triggered_by=c.triggered_by,
                status=c.status,
                executed_at=c.executed_at,
            )
            for c in d.commands
        ],
    )

@router.post("/devices", response_model=IoTDeviceOut, status_code=status.HTTP_201_CREATED)
async def create_device(
    society_id: uuid.UUID,
    payload: DeviceCreate,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = IoTService(db)
    d = await service.create_device(society_id, payload)
    return _format_device(d)

@router.get("/devices", response_model=list[IoTDeviceOut])
async def list_devices(
    society_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = IoTService(db)
    devices = await service.list_devices(society_id)
    return [_format_device(d) for d in devices]

@router.post("/devices/{device_id}/command", response_model=CommandLogOut)
async def execute_command(
    society_id: uuid.UUID,
    device_id: uuid.UUID,
    payload: ExecuteCommandRequest,
    _auth = Depends(require_roles(["society_admin", "guard", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = IoTService(db)
    c = await service.execute_command(society_id, device_id, payload)
    return CommandLogOut(
        id=c.id,
        device_id=c.device_id,
        command=c.command,
        triggered_by=c.triggered_by,
        status=c.status,
        executed_at=c.executed_at,
    )
