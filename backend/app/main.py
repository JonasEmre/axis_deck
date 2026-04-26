from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from backend.app.input_router import InputRouter
from backend.app.schemas import ControlStateMessage, ErrorMessage
from backend.app.ws_manager import WebSocketManager


ROOT_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = ROOT_DIR / "frontend"

app = FastAPI(title="AxisDeck")
manager = WebSocketManager()
input_router = InputRouter()

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
async def health() -> dict[str, str | int]:
    return {"status": "ok", "activeConnections": manager.active_count}


@app.websocket("/ws/control")
async def control_socket(websocket: WebSocket) -> None:
    connection = await manager.connect(websocket)

    try:
        while True:
            raw_message = await websocket.receive_text()

            try:
                message = ControlStateMessage.model_validate_json(raw_message)
            except ValidationError as exc:
                print(f"[ws] invalid message id={connection.id}: {exc.errors()}", flush=True)
                await websocket.send_json(
                    ErrorMessage(message="Invalid control_state payload").model_dump()
                )
                continue

            await input_router.route(message)
    except WebSocketDisconnect:
        manager.disconnect(connection.id)
