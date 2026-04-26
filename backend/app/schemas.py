from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AxesState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    joystickX: float = Field(ge=-1.0, le=1.0)
    joystickY: float = Field(ge=-1.0, le=1.0)
    throttle: float = Field(ge=0.0, le=1.0)
    brake: float = Field(default=0.0, ge=0.0, le=1.0)
    clutch: float = Field(default=0.0, ge=0.0, le=1.0)


class ControlStateMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["control_state"]
    clientId: str = Field(min_length=1, max_length=80)
    timestamp: int = Field(ge=0)
    axes: AxesState
    buttons: dict[str, bool] = Field(default_factory=dict)


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    message: str
