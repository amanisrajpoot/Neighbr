import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Any

class DeviceCreate(BaseModel):
    name: str
    device_type: str  # BOOM_BARRIER, RFID_READER, ANPR_CAMERA, BLE_BEACON
    gate_id: uuid.UUID | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    firmware_version: str = "v2.4.1"

class ExecuteCommandRequest(BaseModel):
    command: str  # OPEN_BARRIER, CLOSE_BARRIER, REBOOT, SYNC_WHITELIST
    triggered_by: str = "ADMIN_DASHBOARD"

class CommandLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_id: uuid.UUID
    command: str
    triggered_by: str
    status: str
    executed_at: datetime

class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    gate_id: uuid.UUID | None = None
    name: str
    device_type: str
    ip_address: str | None = None
    mac_address: str | None = None
    status: str
    firmware_version: str
    last_heartbeat_at: datetime
    created_at: datetime
    commands: list[CommandLogOut] = []
