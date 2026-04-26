from backend.app.adapters.log_adapter import LogInputAdapter
from backend.app.schemas import ControlStateMessage


class InputRouter:
    def __init__(self) -> None:
        self._adapter = LogInputAdapter()

    async def route(self, message: ControlStateMessage) -> None:
        await self._adapter.handle_control_state(message)
