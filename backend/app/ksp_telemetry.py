import asyncio
import math
import os
import socket
import time
from dataclasses import dataclass
from typing import Any

from backend.app.schemas import KspTelemetryMessage, KspTelemetryResources
from backend.app.ws_manager import WebSocketManager


RESOURCE_KEYS = {
    "SolidFuel": "solidFuel",
    "LiquidFuel": "liquidFuel",
    "Oxidizer": "oxidizer",
    "MonoPropellant": "monoPropellant",
    "ElectricCharge": "electricCharge",
    "IntakeAir": "intakeAir",
}


@dataclass
class KspConnection:
    conn: Any
    vessel: Any | None = None
    flight: Any | None = None


class KspTelemetryService:
    def __init__(self, manager: WebSocketManager) -> None:
        self._manager = manager
        self._task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()
        self._connection: KspConnection | None = None
        self._latest = self._make_message(status="disconnected")
        self._address = os.getenv("AXISDECK_KRPC_ADDRESS", "127.0.0.1")
        self._rpc_port = int(os.getenv("AXISDECK_KRPC_RPC_PORT", "50000"))
        self._stream_port = int(os.getenv("AXISDECK_KRPC_STREAM_PORT", "50001"))
        self._poll_interval_seconds = float(os.getenv("AXISDECK_KSP_POLL_SECONDS", "0.2"))
        self._reconnect_interval_seconds = float(os.getenv("AXISDECK_KSP_RECONNECT_SECONDS", "3.0"))

    @property
    def latest(self) -> KspTelemetryMessage:
        return self._latest

    async def start(self) -> None:
        if self._task and not self._task.done():
            return

        self._stop_event.clear()
        self._task = asyncio.create_task(self._run(), name="ksp-telemetry")

    async def stop(self) -> None:
        self._stop_event.set()

        if self._task:
            self._task.cancel()
            try:
                await asyncio.wait_for(self._task, timeout=2.0)
            except (asyncio.CancelledError, TimeoutError):
                pass

        await asyncio.to_thread(self._close_connection)

    async def _run(self) -> None:
        while not self._stop_event.is_set():
            if not self._connection:
                await self._publish(self._make_message(status="connecting"))

                try:
                    self._connection = await asyncio.to_thread(self._connect)
                    await self._publish(self._make_message(status="waiting_vessel"))
                except Exception as exc:
                    self._connection = None
                    await self._publish(
                        self._make_message(status="disconnected", error=self._format_error(exc))
                    )
                    await self._sleep(self._reconnect_interval_seconds)
                    continue

            try:
                await self._publish(await asyncio.to_thread(self._read_snapshot, self._connection))
                await self._sleep(self._poll_interval_seconds)
            except Exception as exc:
                if self._is_no_active_vessel_error(exc):
                    await self._publish(
                        self._make_message(status="waiting_vessel", error="No active vessel")
                    )
                    await self._sleep(self._poll_interval_seconds)
                    continue

                await asyncio.to_thread(self._close_connection)
                self._connection = None
                await self._publish(self._make_message(status="error", error=self._format_error(exc)))
                await self._sleep(self._reconnect_interval_seconds)

    def _connect(self) -> KspConnection:
        with socket.create_connection((self._address, self._rpc_port), timeout=0.75):
            pass

        import krpc

        conn = krpc.connect(
            name="AxisDeck",
            address=self._address,
            rpc_port=self._rpc_port,
            stream_port=self._stream_port,
        )
        return KspConnection(conn=conn)

    def _close_connection(self) -> None:
        if not self._connection:
            return

        try:
            self._connection.conn.close()
        except Exception:
            pass
        finally:
            self._connection = None

    def _read_snapshot(self, connection: KspConnection | None) -> KspTelemetryMessage:
        if not connection:
            return self._make_message(status="disconnected")

        scene = str(connection.conn.krpc.current_game_scene)
        if "flight" not in scene.lower():
            connection.vessel = None
            connection.flight = None
            return self._make_message(status="waiting_vessel", error=f"Game scene: {scene}")

        vessel = connection.conn.space_center.active_vessel
        if connection.vessel is None or vessel != connection.vessel:
            connection.vessel = vessel
            connection.flight = vessel.flight(vessel.orbit.body.reference_frame)

        flight = connection.flight
        orbit = vessel.orbit
        resources = self._read_resources(vessel.resources)
        vertical_speed = self._safe_float(flight.vertical_speed)
        g_force = self._safe_float(flight.g_force)
        resources["gForce"] = self._normalize(g_force, 0.0, 6.0)
        resources["verticalSpeed"] = self._normalize(vertical_speed, -100.0, 100.0)

        return self._make_message(
            status="connected",
            vesselName=str(vessel.name or ""),
            speed=self._safe_float(flight.speed),
            altitude=self._safe_float(flight.mean_altitude),
            apoapsisAltitude=self._safe_float(orbit.apoapsis_altitude),
            periapsisAltitude=self._safe_float(orbit.periapsis_altitude),
            timeToApoapsis=self._safe_float(orbit.time_to_apoapsis),
            timeToPeriapsis=self._safe_float(orbit.time_to_periapsis),
            verticalSpeed=vertical_speed,
            gForce=g_force,
            resources=KspTelemetryResources(**resources),
        )

    def _read_resources(self, resources: Any) -> dict[str, float]:
        values = {}

        for resource_name, payload_key in RESOURCE_KEYS.items():
            try:
                maximum = self._safe_float(resources.max(resource_name))
                amount = self._safe_float(resources.amount(resource_name))
            except Exception:
                values[payload_key] = 0.0
                continue

            values[payload_key] = self._normalize(amount, 0.0, maximum) if maximum > 0 else 0.0

        return values

    async def _publish(self, message: KspTelemetryMessage) -> None:
        self._latest = message
        await self._manager.broadcast_json(message.model_dump())

    async def _sleep(self, seconds: float) -> None:
        try:
            await asyncio.wait_for(self._stop_event.wait(), timeout=seconds)
        except TimeoutError:
            pass

    def _make_message(self, status: str, **values: Any) -> KspTelemetryMessage:
        payload = {
            "status": status,
            "timestamp": int(time.time() * 1000),
            **values,
        }
        return KspTelemetryMessage(**payload)

    def _safe_float(self, value: Any) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return 0.0

        if not math.isfinite(number):
            return 0.0

        return number

    def _normalize(self, value: float, minimum: float, maximum: float) -> float:
        if maximum <= minimum:
            return 0.0

        return max(0.0, min(1.0, (value - minimum) / (maximum - minimum)))

    def _format_error(self, exc: Exception) -> str:
        return f"{type(exc).__name__}: {exc}"

    def _is_no_active_vessel_error(self, exc: Exception) -> bool:
        message = str(exc).lower()
        return "activevessel" in message or "active vessel" in message or "parameter name: vessel" in message
