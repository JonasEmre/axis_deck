from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from backend.app.input_router import InputRouter
from backend.app.ksp_telemetry import KspTelemetryService
from backend.app.schemas import ControlStateMessage, ErrorMessage
from backend.app.ws_manager import WebSocketManager


ROOT_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = ROOT_DIR / "frontend"

app = FastAPI(title="AxisDeck")
control_manager = WebSocketManager()
telemetry_manager = WebSocketManager()
input_router = InputRouter()
ksp_telemetry = KspTelemetryService(telemetry_manager)

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
async def health() -> dict[str, str | int]:
    return {
        "status": "ok",
        "activeConnections": control_manager.active_count,
        "kspTelemetryConnections": telemetry_manager.active_count,
        "kspTelemetryStatus": ksp_telemetry.latest.status,
    }


@app.on_event("startup")
async def startup() -> None:
    await ksp_telemetry.start()


@app.on_event("shutdown")
async def shutdown() -> None:
    await ksp_telemetry.stop()


@app.websocket("/ws/control")
async def control_socket(websocket: WebSocket) -> None:
    connection = await control_manager.connect(websocket)

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
        pass
    finally:
        control_manager.disconnect(connection.id)


@app.websocket("/ws/telemetry/ksp")
async def ksp_telemetry_socket(websocket: WebSocket) -> None:
    connection = await telemetry_manager.connect(websocket)
    await telemetry_manager.send_json(connection.id, ksp_telemetry.latest.model_dump())

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        telemetry_manager.disconnect(connection.id)
