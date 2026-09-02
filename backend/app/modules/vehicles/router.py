import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.vehicles.schemas import VehicleCreate, VehicleOut
from app.modules.vehicles.service import VehicleService
from app.modules.vehicles.permissions import RequireResident

router = APIRouter(prefix="/societies/{society_id}/vehicles", tags=["Vehicles"])

@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
async def register_vehicle(
    society_id: uuid.UUID,
    payload: VehicleCreate,
    user: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    return await service.register_vehicle(society_id, payload, user)

@router.get("", response_model=list[VehicleOut])
async def list_vehicles(
    society_id: uuid.UUID,
    unit_id: uuid.UUID | None = None,
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    return await service.list_vehicles(society_id, unit_id=unit_id)

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    society_id: uuid.UUID,
    vehicle_id: uuid.UUID,
    user: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    await service.delete_vehicle(society_id, vehicle_id, user)
