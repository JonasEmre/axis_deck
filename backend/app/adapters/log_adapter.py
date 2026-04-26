from datetime import datetime

from backend.app.schemas import ControlStateMessage


class LogInputAdapter:
    """Temporary adapter that prints incoming control state for validation."""

    async def handle_control_state(self, message: ControlStateMessage) -> None:
        axes = message.axes
        pressed_buttons = [name for name, is_pressed in message.buttons.items() if is_pressed]
        buttons = ",".join(pressed_buttons) if pressed_buttons else "-"
        now = datetime.now().strftime("%H:%M:%S.%f")[:-3]

        print(
            "[{now}] client={client} ts={ts} "
            "joy=({jx:+.2f},{jy:+.2f}) clutch={clutch:.2f} throttle={throttle:.2f} brake={brake:.2f} buttons={buttons}".format(
                now=now,
                client=message.clientId,
                ts=message.timestamp,
                jx=axes.joystickX,
                jy=axes.joystickY,
                clutch=axes.clutch,
                throttle=axes.throttle,
                brake=axes.brake,
                buttons=buttons,
            ),
            flush=True,
        )
