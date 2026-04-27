from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AxesState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    joystickX: float = Field(ge=-1.0, le=1.0)
    joystickY: float = Field(ge=-1.0, le=1.0)
    throttle: float = Field(ge=0.0, le=1.0)
    brake: float = Field(default=0.0, ge=0.0, le=1.0)
    clutch: float = Field(default=0.0, ge=0.0, le=1.0)
    roll: float = Field(default=0.0, ge=-1.0, le=1.0)
    translateForward: float = Field(default=0.0, ge=-1.0, le=1.0)
    translateX: float = Field(default=0.0, ge=-1.0, le=1.0)
    translateY: float = Field(default=0.0, ge=-1.0, le=1.0)


class ControlStateMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["control_state"]
    updateType: Literal["full", "buttons"] = "full"
    moduleId: Literal["steering", "ksp"] = "steering"
    clientId: str = Field(min_length=1, max_length=80)
    timestamp: int = Field(ge=0)
    axes: AxesState
    buttons: dict[str, bool] = Field(default_factory=dict)


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    message: str


class KspTelemetryResources(BaseModel):
    model_config = ConfigDict(extra="forbid")

    solidFuel: float = Field(default=0.0, ge=0.0, le=1.0)
    liquidFuel: float = Field(default=0.0, ge=0.0, le=1.0)
    oxidizer: float = Field(default=0.0, ge=0.0, le=1.0)
    monoPropellant: float = Field(default=0.0, ge=0.0, le=1.0)
    electricCharge: float = Field(default=0.0, ge=0.0, le=1.0)
    intakeAir: float = Field(default=0.0, ge=0.0, le=1.0)
    gForce: float = Field(default=0.0, ge=0.0, le=1.0)
    verticalSpeed: float = Field(default=0.5, ge=0.0, le=1.0)


class KspTelemetryMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["ksp_telemetry"] = "ksp_telemetry"
    status: Literal["disconnected", "connecting", "connected", "waiting_vessel", "error"]
    timestamp: int = Field(ge=0)
    vesselName: str = ""
    speed: float = 0.0
    altitude: float = 0.0
    apoapsisAltitude: float = 0.0
    periapsisAltitude: float = 0.0
    timeToApoapsis: float = 0.0
    timeToPeriapsis: float = 0.0
    verticalSpeed: float = 0.0
    gForce: float = 0.0
    resources: KspTelemetryResources = Field(default_factory=KspTelemetryResources)
    error: str | None = None
