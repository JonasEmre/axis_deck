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
