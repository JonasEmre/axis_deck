from dataclasses import dataclass
from uuid import uuid4

from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState


@dataclass
class ClientConnection:
    id: str
    websocket: WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[str, ClientConnection] = {}

    async def connect(self, websocket: WebSocket) -> ClientConnection:
        await websocket.accept()
        connection = ClientConnection(id=str(uuid4()), websocket=websocket)
        self._connections[connection.id] = connection
        return connection

    @property
    def active_count(self) -> int:
        return len(self._connections)

    def disconnect(self, connection_id: str) -> None:
        self._connections.pop(connection_id, None)

    async def send_json(self, connection_id: str, payload: dict) -> None:
        connection = self._connections.get(connection_id)
        if not connection:
            return

        try:
            await connection.websocket.send_json(payload)
        except (RuntimeError, WebSocketDisconnect):
            self.disconnect(connection_id)

    async def broadcast_json(self, payload: dict) -> None:
        stale_connection_ids = []

        for connection_id, connection in list(self._connections.items()):
            if connection.websocket.client_state != WebSocketState.CONNECTED:
                stale_connection_ids.append(connection_id)
                continue

            try:
                await connection.websocket.send_json(payload)
            except (RuntimeError, WebSocketDisconnect):
                stale_connection_ids.append(connection_id)

        for connection_id in stale_connection_ids:
            self.disconnect(connection_id)
