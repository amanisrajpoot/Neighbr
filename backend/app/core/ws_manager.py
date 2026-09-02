import asyncio
from collections import defaultdict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # society_id -> set of websockets
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, society_id: str):
        await websocket.accept()
        async with self._lock:
            self._rooms[society_id].add(websocket)

    async def disconnect(self, websocket: WebSocket, society_id: str):
        async with self._lock:
            self._rooms[society_id].discard(websocket)

    async def broadcast(self, society_id: str, message: dict):
        dead = set()
        async with self._lock:
            for ws in list(self._rooms.get(society_id, [])):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self._rooms[society_id].discard(ws)

ws_manager = ConnectionManager()
