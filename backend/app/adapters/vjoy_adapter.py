from backend.app.schemas import ControlStateMessage


VJOY_AXIS_MIN = 0x0001
VJOY_AXIS_MAX = 0x8000
VJOY_AXIS_CENTER = (VJOY_AXIS_MAX + VJOY_AXIS_MIN) // 2


class VJoyInputAdapter:
    def __init__(self, device_id: int = 1) -> None:
        import pyvjoy

        self._pyvjoy = pyvjoy
        self._device = pyvjoy.VJoyDevice(device_id)
        self._device.reset()
        self._axis_map = {
            "joystickX": pyvjoy.HID_USAGE_X,
            "joystickY": pyvjoy.HID_USAGE_Y,
            "throttle": pyvjoy.HID_USAGE_Z,
            "brake": pyvjoy.HID_USAGE_RZ,
        }
        self._button_map = {
            "fire": 1,
            "gear": 2,
            "boost": 3,
            "mode": 4,
        }

    async def handle_control_state(self, message: ControlStateMessage) -> None:
        axes = message.axes
        self._set_axis("joystickX", self._signed_axis_to_vjoy(axes.joystickX))
        self._set_axis("joystickY", self._signed_axis_to_vjoy(-axes.joystickY))
        self._set_axis("throttle", self._unsigned_axis_to_vjoy(axes.throttle))
        self._set_axis("brake", self._unsigned_axis_to_vjoy(axes.brake))

        for button_name, button_id in self._button_map.items():
            self._device.set_button(button_id, int(message.buttons.get(button_name, False)))

    def _set_axis(self, axis_name: str, value: int) -> None:
        self._device.set_axis(self._axis_map[axis_name], value)

    def _signed_axis_to_vjoy(self, value: float) -> int:
        normalized = (self._clamp(value, -1.0, 1.0) + 1.0) / 2.0
        return self._unsigned_axis_to_vjoy(normalized)

    def _unsigned_axis_to_vjoy(self, value: float) -> int:
        normalized = self._clamp(value, 0.0, 1.0)
        return round(VJOY_AXIS_MIN + normalized * (VJOY_AXIS_MAX - VJOY_AXIS_MIN))

    def _clamp(self, value: float, minimum: float, maximum: float) -> float:
        return min(maximum, max(minimum, value))
