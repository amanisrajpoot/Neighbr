import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.iot.models import IoTDevice, DeviceCommandLog
from app.modules.iot.repository import IoTRepository
from app.modules.iot.events import IOT_DEVICE_CREATED, IOT_COMMAND_EXECUTED
from app.modules.iot.schemas import DeviceCreate, ExecuteCommandRequest

class IoTService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = IoTRepository(db)

    async def create_device(self, society_id: uuid.UUID, payload: DeviceCreate) -> IoTDevice:
        device = IoTDevice(
            society_id=society_id,
            gate_id=payload.gate_id,
            name=payload.name.strip(),
            device_type=payload.device_type,
            ip_address=payload.ip_address,
            mac_address=payload.mac_address,
            firmware_version=payload.firmware_version,
            status="ONLINE",
        )
        await self.repo.save(device)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id="SYSTEM",
                event_type=IOT_DEVICE_CREATED,
                entity_type="iot_device",
                entity_id=str(device.id),
                payload={"device_name": device.name, "device_type": device.device_type},
            )
        )
        return device

    async def list_devices(self, society_id: uuid.UUID) -> list[IoTDevice]:
        return await self.repo.list_devices(society_id)

    async def execute_command(
        self, society_id: uuid.UUID, device_id: uuid.UUID, payload: ExecuteCommandRequest
    ) -> DeviceCommandLog:
        device = await self.repo.get_device(society_id, device_id)
        if not device:
            raise AppException(code="DEVICE_NOT_FOUND", message="IoT device not found", status_code=404)

        cmd = DeviceCommandLog(
            device_id=device.id,
            command=payload.command,
            triggered_by=payload.triggered_by,
            status="EXECUTED",
        )
        device.last_heartbeat_at = datetime.now(timezone.utc)
        self.db.add(cmd)
        await self.repo.commit()
        await self.db.refresh(cmd)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id="SYSTEM",
                event_type=IOT_COMMAND_EXECUTED,
                entity_type="iot_device",
                entity_id=str(device.id),
                payload={"command": payload.command, "device": device.name},
            )
        )
        return cmd
