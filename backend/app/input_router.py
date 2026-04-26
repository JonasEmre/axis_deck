import os

from backend.app.adapters.log_adapter import LogInputAdapter
from backend.app.adapters.vjoy_adapter import VJoyInputAdapter
from backend.app.schemas import ControlStateMessage


class InputRouter:
    def __init__(self) -> None:
        adapter_name = os.getenv("AXISDECK_INPUT_ADAPTER", "log").strip().lower()
        self._adapter = self._create_adapter(adapter_name)

    async def route(self, message: ControlStateMessage) -> None:
        await self._adapter.handle_control_state(message)

    def _create_adapter(self, adapter_name: str):
        if adapter_name != "vjoy":
            print("[input] using log adapter", flush=True)
            return LogInputAdapter()

        try:
            adapter = VJoyInputAdapter(device_id=int(os.getenv("AXISDECK_VJOY_DEVICE_ID", "1")))
        except Exception as exc:
            print(
                f"[input] vJoy adapter unavailable ({type(exc).__name__}: {exc}); falling back to log adapter",
                flush=True,
            )
            return LogInputAdapter()

        print("[input] using vJoy adapter", flush=True)
        return adapter
