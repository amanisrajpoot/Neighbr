import asyncio
import json
import redis.asyncio as redis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.config import get_settings
from app.modules.notifications.websocket import manager

router = APIRouter()
settings = get_settings()

async def redis_listener(websocket: WebSocket, user_id: str):
    # Subscribe to a redis channel specific to the user_id
    r = redis.from_url(settings.REDIS_URL)
    pubsub = r.pubsub()
    channel = f"notifications:{user_id}"
    await pubsub.subscribe(channel)
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                await websocket.send_json(data)
    except Exception:
        pass
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
        await r.aclose()

@router.websocket("/ws/{user_id}")
async def user_ws(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    
    # Start Redis listener task for this connection
    listener_task = asyncio.create_task(redis_listener(websocket, user_id))
    
    try:
        while True:
            # wait for messages from client (e.g. keep alive)
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        listener_task.cancel()
        manager.disconnect(user_id)
