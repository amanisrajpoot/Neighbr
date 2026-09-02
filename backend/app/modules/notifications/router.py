import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.models import User
from app.modules.notifications.permissions import RequireAuth
from app.modules.notifications.schemas import NotificationOut, UnreadCountResponse
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=list[NotificationOut])
async def list_my_notifications(
    user: User = RequireAuth,
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    return await service.list_notifications(user.id)

@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    user: User = RequireAuth,
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    count = await service.get_unread_count(user.id)
    return UnreadCountResponse(unread_count=count)

@router.post("/{notification_id}/read", response_model=NotificationOut | None)
async def mark_notification_read(
    notification_id: uuid.UUID,
    user: User = RequireAuth,
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    return await service.mark_read(user.id, notification_id)

@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    user: User = RequireAuth,
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    await service.mark_all_read(user.id)

from fastapi import WebSocket, WebSocketDisconnect
from app.modules.notifications.websocket import manager

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    # Send initial connection frame
    await websocket.send_json({"type": "CONNECTED", "user_id": str(user_id)})
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "PONG", "status": "OK"})
    except WebSocketDisconnect:
        manager.disconnect(user_id)
