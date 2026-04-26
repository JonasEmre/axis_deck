from dataclasses import dataclass, field
from uuid import uuid4

from fastapi import WebSocket


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
        print(f"[ws] connected id={connection.id} active={len(self._connections)}", flush=True)
        return connection

    def disconnect(self, connection_id: str) -> None:
        self._connections.pop(connection_id, None)
        print(f"[ws] disconnected id={connection_id} active={len(self._connections)}", flush=True)

    @property
    def active_count(self) -> int:
        return len(self._connections)
