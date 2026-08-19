import uuid
from typing import Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps user_id string to WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[str(user_id)] = websocket

    def disconnect(self, user_id: str):
        uid_str = str(user_id)
        if uid_str in self.active_connections:
            del self.active_connections[uid_str]

    async def send_personal_message(self, message: str, user_id: str):
        websocket = self.active_connections.get(str(user_id))
        if websocket:
            await websocket.send_text(message)

    async def send_json_message(self, message: dict, user_id: str):
        websocket = self.active_connections.get(str(user_id))
        if websocket:
            try:
                await websocket.send_json(message)
            except Exception:
                pass

    async def broadcast_json(self, message: dict):
        for uid, websocket in list(self.active_connections.items()):
            try:
                await websocket.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()
