import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.iot.permissions import RequireIoTAdmin
from app.modules.iot.schemas import (
    DeviceCreate,
    DeviceOut,
    ExecuteCommandRequest,
    CommandLogOut,
)
from app.modules.iot.service import IoTService

router = APIRouter(prefix="/societies/{society_id}/iot", tags=["IoT & Devices"])

@router.post("/devices", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
async def create_device(
    society_id: uuid.UUID,
    payload: DeviceCreate,
    _auth = RequireIoTAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = IoTService(db)
    d = await service.create_device(society_id, payload)
    return DeviceOut(
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
        commands=[],
    )

@router.get("/devices", response_model=list[DeviceOut])
async def list_devices(
    society_id: uuid.UUID,
    _auth = RequireIoTAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = IoTService(db)
    devices = await service.list_devices(society_id)
    out = []
    for d in devices:
        cmds = [
            CommandLogOut(
                id=c.id,
                device_id=c.device_id,
                command=c.command,
                triggered_by=c.triggered_by,
                status=c.status,
                executed_at=c.executed_at,
            )
            for c in d.commands
        ]
        out.append(
            DeviceOut(
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
                commands=cmds,
            )
        )
    return out

@router.post("/devices/{device_id}/command", response_model=CommandLogOut)
async def execute_command(
    society_id: uuid.UUID,
    device_id: uuid.UUID,
    payload: ExecuteCommandRequest,
    _auth = RequireIoTAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = IoTService(db)
    cmd = await service.execute_command(society_id, device_id, payload)
    return CommandLogOut(
        id=cmd.id,
        device_id=cmd.device_id,
        command=cmd.command,
        triggered_by=cmd.triggered_by,
        status=cmd.status,
        executed_at=cmd.executed_at,
    )
