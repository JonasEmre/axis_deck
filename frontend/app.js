const statusEl = document.querySelector("#connectionStatus");
const controlModeEl = document.querySelector("#controlMode");
const joystickCanvas = document.querySelector("#joystickCanvas");
const joystickReadout = document.querySelector("#joystickReadout");
const primaryControlTitle = document.querySelector("#primaryControlTitle");
const pedalsReadout = document.querySelector("#pedalsReadout");
const springAxisEls = [...document.querySelectorAll(".spring-axis")];
const shifter = document.querySelector("#shifter");
const gearSlotEls = [...document.querySelectorAll(".gear-slot")];
const gearKnob = document.querySelector("#gearKnob");
const buttonReadout = document.querySelector("#buttonReadout");
const buttonEls = [...document.querySelectorAll(".control-button")];

const FRAME_INTERVAL_MS = 1000 / 60;
const SEND_INTERVAL_MS = 100;
const clientId = getClientId();
const state = {
  axes: {
    joystickX: 0,
    joystickY: 0,
    throttle: 0,
    brake: 0,
    clutch: 0,
  },
  buttons: {
    gear1: false,
    gear2: false,
    gear3: false,
    gear4: false,
    gear5: false,
    reverse: false,
    handbrake: false,
    start: false,
    lights: false,
    horn: false,
  },
};

const STEERING_MAX_ROTATION_DEGREES = 450;
const STEERING_RETURN_RATE = 3.2;
const STEERING_CENTER_EPSILON_DEGREES = 0.35;
const SHIFTER_SLOT_SNAP_RATIO = 0.24;
const SHIFTER_COLUMN_SWITCH_RATIO = 0.16;

let socket = null;
let reconnectTimer = null;
let joystickPointerId = null;
let controlMode = "joystick";
let steeringAngle = 0;
let steeringLastPointerAngle = 0;
let steeringLastSentAxis = 0;
let selectedGear = null;
let shifterPointerId = null;
const springAxisPointers = new Map();

function getClientId() {
  const existing = window.localStorage.getItem("ccpClientId");
  if (existing) {
    return existing;
  }

  const next = `tablet-${Math.random().toString(16).slice(2, 8)}`;
  window.localStorage.setItem("ccpClientId", next);
  return next;
}

function setStatus(label, className) {
  statusEl.textContent = label;
  statusEl.className = `status ${className}`;
}

function connect() {
  window.clearTimeout(reconnectTimer);
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${protocol}://${window.location.host}/ws/control`;

  setStatus("Connecting", "");
  socket = new WebSocket(wsUrl);

  socket.addEventListener("open", () => {
    setStatus("Connected", "connected");
    sendState();
  });

  socket.addEventListener("close", () => {
    setStatus("Disconnected", "disconnected");
    reconnectTimer = window.setTimeout(connect, 1500);
  });

  socket.addEventListener("error", () => {
    setStatus("Error", "disconnected");
    socket.close();
  });
}

function sendState() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: "control_state",
      clientId,
      timestamp: Date.now(),
      axes: state.axes,
      buttons: state.buttons,
    }),
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundAxis(value) {
  return Math.round(value * 1000) / 1000;
}

function resizeJoystickCanvas() {
  const rect = joystickCanvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  joystickCanvas.width = Math.round(rect.width * scale);
  joystickCanvas.height = Math.round(rect.height * scale);
  drawPrimaryControl();
}

function drawPrimaryControl() {
  if (controlMode === "steering") {
    drawSteering();
    return;
  }

  drawJoystick();
}

function getCanvasMetrics() {
  const width = joystickCanvas.width;
  const height = joystickCanvas.height;
  const size = Math.min(width, height);

  return {
    width,
    height,
    size,
    cx: width / 2,
    cy: height / 2,
  };
}

function drawJoystick() {
  const ctx = joystickCanvas.getContext("2d");
  const { width, height, size, cx, cy } = getCanvasMetrics();
  const radius = size * 0.36;
  const knobRadius = size * 0.105;
  const knobX = cx + state.axes.joystickX * radius;
  const knobY = cy + state.axes.joystickY * radius;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "#34404c";
  ctx.lineWidth = Math.max(2, size * 0.008);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#25313b";
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  ctx.fillStyle = "#4fd1b1";
  ctx.beginPath();
  ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(2, size * 0.006);
  ctx.stroke();
}

function drawSteering() {
  const ctx = joystickCanvas.getContext("2d");
  const { width, height, size, cx, cy } = getCanvasMetrics();
  const radius = size * 0.42;
  const innerRadius = radius * 0.62;
  const markerLength = radius * 0.42;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((steeringAngle * Math.PI) / 180);

  ctx.strokeStyle = "#34404c";
  ctx.lineWidth = Math.max(8, size * 0.035);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#4fd1b1";
  ctx.lineWidth = Math.max(3, size * 0.012);
  for (const spokeAngle of [-130, -50, 90]) {
    const radians = (spokeAngle * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(Math.cos(radians) * innerRadius * 0.22, Math.sin(radians) * innerRadius * 0.22);
    ctx.lineTo(Math.cos(radians) * innerRadius, Math.sin(radians) * innerRadius);
    ctx.stroke();
  }

  ctx.strokeStyle = "#ff4b4b";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(5, size * 0.018);
  ctx.beginPath();
  ctx.moveTo(0, -radius - markerLength * 0.08);
  ctx.lineTo(0, -radius + markerLength);
  ctx.stroke();

  ctx.fillStyle = "#edf6f3";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function getCanvasPointerInfo(event) {
  const rect = joystickCanvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  return {
    cx,
    cy,
    dx: event.clientX - cx,
    dy: event.clientY - cy,
    radius: Math.min(rect.width, rect.height) * 0.36,
  };
}

function updateJoystickFromPointer(event) {
  const { dx, dy, radius } = getCanvasPointerInfo(event);
  const distance = Math.hypot(dx, dy);
  const limitedDistance = Math.min(distance, radius);
  const angle = Math.atan2(dy, dx);

  state.axes.joystickX = roundAxis((Math.cos(angle) * limitedDistance) / radius);
  state.axes.joystickY = roundAxis((Math.sin(angle) * limitedDistance) / radius);
  joystickReadout.textContent = `X ${state.axes.joystickX.toFixed(2)} / Y ${state.axes.joystickY.toFixed(2)}`;
  drawPrimaryControl();
  sendState();
}

function getPointerAngle(event) {
  const { dx, dy } = getCanvasPointerInfo(event);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function shortestAngleDelta(fromAngle, toAngle) {
  return ((((toAngle - fromAngle) % 360) + 540) % 360) - 180;
}

function updateSteeringFromPointer(event) {
  const pointerAngle = getPointerAngle(event);
  const delta = shortestAngleDelta(steeringLastPointerAngle, pointerAngle);

  steeringAngle = clamp(
    steeringAngle + delta,
    -STEERING_MAX_ROTATION_DEGREES,
    STEERING_MAX_ROTATION_DEGREES,
  );
  steeringLastPointerAngle = pointerAngle;
  state.axes.joystickX = roundAxis(steeringAngle / STEERING_MAX_ROTATION_DEGREES);
  state.axes.joystickY = 0;
  joystickReadout.textContent = `Steer ${steeringAngle.toFixed(0)} deg / X ${state.axes.joystickX.toFixed(2)}`;
  drawPrimaryControl();
  sendState();
}

function setSteeringAngle(nextAngle) {
  steeringAngle = clamp(
    nextAngle,
    -STEERING_MAX_ROTATION_DEGREES,
    STEERING_MAX_ROTATION_DEGREES,
  );
  state.axes.joystickX = roundAxis(steeringAngle / STEERING_MAX_ROTATION_DEGREES);
  state.axes.joystickY = 0;
  joystickReadout.textContent = `Steer ${steeringAngle.toFixed(0)} deg / X ${state.axes.joystickX.toFixed(2)}`;
  drawPrimaryControl();
}

function releasePrimaryControl() {
  joystickPointerId = null;

  if (controlMode === "steering") {
    return;
  }

  resetJoystick();
}

function resetJoystick() {
  joystickPointerId = null;
  state.axes.joystickX = 0;
  state.axes.joystickY = 0;
  steeringAngle = 0;
  joystickReadout.textContent = "X 0.00 / Y 0.00";
  drawPrimaryControl();
  sendState();
}

function animateSteeringReturn() {
  if (controlMode !== "steering" || joystickPointerId !== null || steeringAngle === 0) {
    return;
  }

  const nextAngle = steeringAngle + (0 - steeringAngle) * STEERING_RETURN_RATE * (FRAME_INTERVAL_MS / 1000);

  if (Math.abs(nextAngle) <= STEERING_CENTER_EPSILON_DEGREES) {
    setSteeringAngle(0);
  } else {
    setSteeringAngle(nextAngle);
  }

  if (state.axes.joystickX !== steeringLastSentAxis || steeringAngle === 0) {
    steeringLastSentAxis = state.axes.joystickX;
    sendState();
  }
}

function renderSpringAxis(axisEl) {
  const axisName = axisEl.dataset.axis;
  const percent = state.axes[axisName] * 100;
  const fill = axisEl.querySelector(".spring-axis-fill");
  const thumb = axisEl.querySelector(".spring-axis-thumb");

  fill.style.height = `${percent}%`;
  thumb.style.bottom = `${percent}%`;
  axisEl.setAttribute("aria-valuenow", String(Math.round(percent)));
}

function updatePedalsReadout() {
  pedalsReadout.textContent = `C ${state.axes.clutch.toFixed(2)} / B ${state.axes.brake.toFixed(2)} / T ${state.axes.throttle.toFixed(2)}`;
}

function updateSpringAxisFromPointer(axisEl, event) {
  const axisName = axisEl.dataset.axis;
  const rect = axisEl.getBoundingClientRect();
  const y = clamp(event.clientY - rect.top, 0, rect.height);
  state.axes[axisName] = roundAxis(1 - y / rect.height);

  renderSpringAxis(axisEl);
  updatePedalsReadout();
  sendState();
}

function resetSpringAxis(axisEl) {
  const axisName = axisEl.dataset.axis;
  springAxisPointers.delete(axisName);
  state.axes[axisName] = 0;
  renderSpringAxis(axisEl);
  updatePedalsReadout();
  sendState();
}

joystickCanvas.addEventListener("pointerdown", (event) => {
  joystickPointerId = event.pointerId;
  joystickCanvas.setPointerCapture(event.pointerId);

  if (controlMode === "steering") {
    steeringLastPointerAngle = getPointerAngle(event);
    updateSteeringFromPointer(event);
    return;
  }

  updateJoystickFromPointer(event);
});

joystickCanvas.addEventListener("pointermove", (event) => {
  if (event.pointerId === joystickPointerId) {
    if (controlMode === "steering") {
      updateSteeringFromPointer(event);
      return;
    }

    updateJoystickFromPointer(event);
  }
});

joystickCanvas.addEventListener("pointerup", (event) => {
  if (event.pointerId === joystickPointerId) {
    releasePrimaryControl();
  }
});

joystickCanvas.addEventListener("pointercancel", releasePrimaryControl);
joystickCanvas.addEventListener("lostpointercapture", releasePrimaryControl);

controlModeEl.addEventListener("change", () => {
  controlMode = controlModeEl.value;
  primaryControlTitle.textContent = controlMode === "steering" ? "Steering" : "Joystick";
  resetJoystick();
});

function setSelectedGear(nextGear) {
  selectedGear = nextGear;

  gearSlotEls.forEach((slot) => {
    const gearName = slot.dataset.gear;
    const isActive = gearName === selectedGear;
    state.buttons[gearName] = isActive;
    slot.classList.toggle("active", isActive);
  });

  gearKnob.textContent = selectedGear ? getGearLabel(selectedGear) : "N";
  buttonReadout.textContent = selectedGear ? selectedGear : "Ready";
  sendState();
}

function getGearLabel(gearName) {
  if (gearName === "reverse") {
    return "R";
  }

  return gearName.replace("gear", "");
}

function setGearKnobOffset(x, y) {
  gearKnob.style.setProperty("--knob-x", `${x}px`);
  gearKnob.style.setProperty("--knob-y", `${y}px`);
}

function getShifterCenter() {
  const shifterRect = shifter.getBoundingClientRect();
  const knobRect = gearKnob.getBoundingClientRect();

  return {
    x: shifterRect.left + shifterRect.width / 2,
    y: shifterRect.top + shifterRect.height / 2,
    knobSize: Math.min(knobRect.width, knobRect.height),
  };
}

function getGearSlots() {
  return gearSlotEls.map((slot) => {
    const rect = slot.getBoundingClientRect();

    return {
      gear: slot.dataset.gear,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  });
}

function getShifterColumns() {
  const columns = [];

  getGearSlots().forEach((slot) => {
    if (!columns.some((column) => Math.abs(column - slot.x) < 1)) {
      columns.push(slot.x);
    }
  });

  return columns.sort((a, b) => a - b);
}

function getNearestColumn(x) {
  return getShifterColumns().reduce((nearest, column) => {
    return Math.abs(column - x) < Math.abs(nearest - x) ? column : nearest;
  });
}

function getShifterPathPoint(event) {
  const center = getShifterCenter();
  const shifterRect = shifter.getBoundingClientRect();
  const columns = getShifterColumns();
  const horizontalMin = columns[0];
  const horizontalMax = columns[columns.length - 1];
  const rawX = clamp(event.clientX, horizontalMin, horizontalMax);
  const nearestColumn = getNearestColumn(rawX);
  const columnSwitchDistance = shifterRect.width * SHIFTER_COLUMN_SWITCH_RATIO;
  const isOnColumn = Math.abs(rawX - nearestColumn) <= columnSwitchDistance;

  if (!isOnColumn) {
    return {
      x: rawX,
      y: center.y,
    };
  }

  const columnSlots = getGearSlots().filter((slot) => Math.abs(slot.x - nearestColumn) < 1);
  const minY = Math.min(...columnSlots.map((slot) => slot.y));
  const maxY = Math.max(...columnSlots.map((slot) => slot.y));

  return {
    x: nearestColumn,
    y: clamp(event.clientY, minY, maxY),
  };
}

function getNearestGearSlot(point) {
  const shifterRect = shifter.getBoundingClientRect();
  const snapDistance = Math.min(shifterRect.width, shifterRect.height) * SHIFTER_SLOT_SNAP_RATIO;
  const nearest = getGearSlots().reduce((current, slot) => {
    const distance = Math.hypot(point.x - slot.x, point.y - slot.y);

    if (!current || distance < current.distance) {
      return { ...slot, distance };
    }

    return current;
  }, null);

  return nearest && nearest.distance <= snapDistance ? nearest : null;
}

function updateShifterDrag(event) {
  const center = getShifterCenter();
  const pathPoint = getShifterPathPoint(event);
  const offsetX = pathPoint.x - center.x;
  const offsetY = pathPoint.y - center.y;

  setGearKnobOffset(offsetX, offsetY);
}

function releaseShifter(event) {
  shifterPointerId = null;
  const pathPoint = getShifterPathPoint(event);
  const nearest = getNearestGearSlot(pathPoint);

  if (!nearest) {
    setSelectedGear(null);
    setGearKnobOffset(0, 0);
    return;
  }

  const center = getShifterCenter();
  setSelectedGear(nearest.gear);
  setGearKnobOffset(nearest.x - center.x, nearest.y - center.y);
}

shifter.addEventListener("pointerdown", (event) => {
  shifterPointerId = event.pointerId;
  shifter.setPointerCapture(event.pointerId);
  updateShifterDrag(event);
});

shifter.addEventListener("pointermove", (event) => {
  if (event.pointerId === shifterPointerId) {
    updateShifterDrag(event);
  }
});

shifter.addEventListener("pointerup", (event) => {
  if (event.pointerId === shifterPointerId) {
    releaseShifter(event);
  }
});

shifter.addEventListener("pointercancel", () => {
  shifterPointerId = null;
  setSelectedGear(null);
  setGearKnobOffset(0, 0);
});

springAxisEls.forEach((axisEl) => {
  const axisName = axisEl.dataset.axis;

  axisEl.addEventListener("pointerdown", (event) => {
    springAxisPointers.set(axisName, event.pointerId);
    axisEl.setPointerCapture(event.pointerId);
    updateSpringAxisFromPointer(axisEl, event);
  });

  axisEl.addEventListener("pointermove", (event) => {
    if (springAxisPointers.get(axisName) === event.pointerId) {
      updateSpringAxisFromPointer(axisEl, event);
    }
  });

  axisEl.addEventListener("pointerup", (event) => {
    if (springAxisPointers.get(axisName) === event.pointerId) {
      resetSpringAxis(axisEl);
    }
  });

  axisEl.addEventListener("pointercancel", () => resetSpringAxis(axisEl));
  axisEl.addEventListener("lostpointercapture", () => resetSpringAxis(axisEl));
});

buttonEls.forEach((button) => {
  const buttonName = button.dataset.button;

  const setPressed = (isPressed) => {
    state.buttons[buttonName] = isPressed;
    button.classList.toggle("active", isPressed);
    const activeButtons = Object.entries(state.buttons)
      .filter(([, value]) => value)
      .map(([name]) => name);
    buttonReadout.textContent = activeButtons.length ? activeButtons.join(", ") : "Ready";
    sendState();
  };

  button.addEventListener("pointerdown", (event) => {
    button.setPointerCapture(event.pointerId);
    setPressed(true);
  });
  button.addEventListener("pointerup", () => setPressed(false));
  button.addEventListener("pointercancel", () => setPressed(false));
  button.addEventListener("pointerleave", () => setPressed(false));
});

window.addEventListener("resize", resizeJoystickCanvas);
window.addEventListener("orientationchange", resizeJoystickCanvas);

resizeJoystickCanvas();
springAxisEls.forEach(renderSpringAxis);
updatePedalsReadout();
connect();
window.setInterval(animateSteeringReturn, FRAME_INTERVAL_MS);
window.setInterval(sendState, SEND_INTERVAL_MS);
