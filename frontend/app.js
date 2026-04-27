const statusEl = document.querySelector("#connectionStatus");
const controlModeEl = document.querySelector("#controlMode");
const settingsToggle = document.querySelector("#settingsToggle");
const settingsPanel = document.querySelector("#settingsPanel");
const steeringReturnModeEl = document.querySelector("#steeringReturnMode");
const steeringReturnCustomEl = document.querySelector("#steeringReturnCustom");
const steeringFeelEl = document.querySelector("#steeringFeel");
const gameProfileEl = document.querySelector("#gameProfile");
const gearboxOutputModeEl = document.querySelector("#gearboxOutputMode");
const gearboxPositionEl = document.querySelector("#gearboxPosition");
const gearboxTypeEl = document.querySelector("#gearboxType");
const controlDeck = document.querySelector("#controlDeck");
const joystickCanvas = document.querySelector("#joystickCanvas");
const joystickReadout = document.querySelector("#joystickReadout");
const primaryControlTitle = document.querySelector("#primaryControlTitle");
const pedalsReadout = document.querySelector("#pedalsReadout");
const springAxisEls = [...document.querySelectorAll(".spring-axis")];
const shifter = document.querySelector("#shifter");
let gearSlotEls = [...document.querySelectorAll(".gear-slot")];
const gearKnob = document.querySelector("#gearKnob");
const truckToggles = document.querySelector("#truckToggles");
const truckRangeToggle = document.querySelector("#truckRangeToggle");
const truckSplitterToggle = document.querySelector("#truckSplitterToggle");
const reverseToggleWrap = document.querySelector("#reverseToggleWrap");
const reverseToggle = document.querySelector("#reverseToggle");
const buttonReadout = document.querySelector("#buttonReadout");
const buttonEls = [...document.querySelectorAll(".control-button, .topbar-button[data-button]")];

const FRAME_INTERVAL_MS = 1000 / 60;
const SEND_INTERVAL_MS = 100;
const DOUBLE_TAP_ZOOM_WINDOW_MS = 300;
const PEDAL_RESPONSE_RATE = 18;
const PEDAL_RELEASE_RATE = 28;
const PEDAL_EPSILON = 0.002;
const GEAR_PULSE_DURATION_MS = 160;
const GEAR_SHIFT_SETTLE_MS = 70;
const USER_SETTINGS_STORAGE_KEY = "axisDeckUserSettings";
const clientId = getClientId();
applyStoredUserSettings();
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
    gear6: false,
    reverse: false,
    truck5L: false,
    truck5H: false,
    truck6L: false,
    truck6H: false,
    truck7L: false,
    truck7H: false,
    truck8L: false,
    truck8H: false,
    truckR1: false,
    truckR2: false,
    truckL: false,
    neutral: true,
    handbrake: false,
    start: false,
    hazards: false,
    lights: false,
    horn: false,
    leftSignal: false,
    rightSignal: false,
  },
};

const STEERING_MAX_ROTATION_DEGREES = 450;
const STEERING_RETURN_RATES = {
  standard: 1.6,
  fast: 3.2,
};
const STEERING_FEEL_PROFILES = {
  direct: {
    smoothing: 1,
    maxVelocity: Infinity,
  },
  smooth: {
    smoothing: 0.34,
    maxVelocity: 560,
  },
  heavy: {
    smoothing: 0.14,
    maxVelocity: 280,
  },
};
const GAME_PROFILES = {
  "motor-town": {
    label: "Motor Town",
  },
  beamng: {
    label: "BeamNG.drive",
  },
};
const STEERING_CENTER_EPSILON_DEGREES = 0.35;
const SHIFTER_SLOT_SNAP_RATIO = 0.24;
const SHIFTER_COLUMN_BAND_RATIO = 0.11;
const SHIFTER_NEUTRAL_BAND_RATIO = 0.055;
const SHIFTER_VERTICAL_ENTRY_RATIO = 0.55;
const SHIFTER_TICK_COOLDOWN_MS = 90;
const GEAR_BUTTON_NAMES = [
  "neutral",
  "gear1",
  "gear2",
  "gear3",
  "gear4",
  "gear5",
  "gear6",
  "reverse",
  "truck5L",
  "truck5H",
  "truck6L",
  "truck6H",
  "truck7L",
  "truck7H",
  "truck8L",
  "truck8H",
  "truckR1",
  "truckR2",
  "truckL",
];
const TRUCK_DIRECT_GEARS = [
  { gear: "truck-r2", label: "R2", button: "truckR2" },
  { gear: "truck-r1", label: "R1", button: "truckR1" },
  { gear: "truck-l", label: "L", button: "truckL" },
  { gear: "truck-1", label: "1", button: "gear1" },
  { gear: "truck-2", label: "2", button: "gear2" },
  { gear: "truck-3", label: "3", button: "gear3" },
  { gear: "truck-4", label: "4", button: "gear4" },
  { gear: "truck-5l", label: "5L", button: "truck5L" },
  { gear: "truck-5h", label: "5H", button: "truck5H" },
  { gear: "truck-6l", label: "6L", button: "truck6L" },
  { gear: "truck-6h", label: "6H", button: "truck6H" },
  { gear: "truck-7l", label: "7L", button: "truck7L" },
  { gear: "truck-7h", label: "7H", button: "truck7H" },
  { gear: "truck-8l", label: "8L", button: "truck8L" },
  { gear: "truck-8h", label: "8H", button: "truck8H" },
];
const GEARBOX_PROFILES = {
  "5-speed": {
    label: "Five speed and reverse shifter",
    kind: "h",
    columns: 3,
    slots: [
      { gear: "gear1", label: "1", col: 1, row: 1 },
      { gear: "gear2", label: "2", col: 1, row: 3 },
      { gear: "gear3", label: "3", col: 2, row: 1 },
      { gear: "gear4", label: "4", col: 2, row: 3 },
      { gear: "gear5", label: "5", col: 3, row: 1 },
      { gear: "reverse", label: "R", col: 3, row: 3 },
    ],
  },
  "6-speed": {
    label: "Six speed and reverse shifter",
    kind: "h",
    detachedReverse: true,
    columns: 3,
    slots: [
      { gear: "gear1", label: "1", col: 1, row: 1 },
      { gear: "gear2", label: "2", col: 1, row: 3 },
      { gear: "gear3", label: "3", col: 2, row: 1 },
      { gear: "gear4", label: "4", col: 2, row: 3 },
      { gear: "gear5", label: "5", col: 3, row: 1 },
      { gear: "gear6", label: "6", col: 3, row: 3 },
    ],
  },
  "truck-realistic": {
    label: "Truck H range and splitter shifter",
    kind: "truck-h",
    columns: 3,
    slots: [
      { gear: "truckSlotR", label: "R1/R2", col: 1, row: 1 },
      { gear: "truckSlotL", label: "L", col: 1, row: 3 },
      { gear: "truckSlot1", label: "1/5", col: 2, row: 1 },
      { gear: "truckSlot2", label: "2/6", col: 2, row: 3 },
      { gear: "truckSlot3", label: "3/7", col: 3, row: 1 },
      { gear: "truckSlot4", label: "4/8", col: 3, row: 3 },
    ],
  },
  "truck-direct": {
    label: "Truck direct gear selector",
    kind: "direct",
    columns: 5,
    slots: TRUCK_DIRECT_GEARS.map((gear, index) => ({
      ...gear,
      col: (index % 5) + 1,
      row: Math.floor(index / 5) + 1,
    })),
  },
};

let socket = null;
let reconnectTimer = null;
let joystickPointerId = null;
let controlMode = controlModeEl.value;
let activeGameProfile = GAME_PROFILES[gameProfileEl.value] || GAME_PROFILES["motor-town"];
let gearboxOutputMode = gearboxOutputModeEl.value;
let steeringFeelProfile = STEERING_FEEL_PROFILES[steeringFeelEl.value] || STEERING_FEEL_PROFILES.direct;
let steeringReturnRate = STEERING_RETURN_RATES.standard;
let steeringAngle = 0;
let steeringTargetAngle = 0;
let steeringLastPointerAngle = 0;
let steeringLastSentAxis = 0;
let selectedGear = null;
let activeGearboxType = gearboxTypeEl.value;
let activeGearboxProfile = GEARBOX_PROFILES[activeGearboxType];
let activeGearButton = "neutral";
let truckRangeHigh = false;
let truckSplitterHigh = false;
let shifterPointerId = null;
let shifterLastPointer = null;
let knobPosition = { x: 0, y: 0 };
let lastGateZone = "neutral";
let lastShiftSoundAt = 0;
let lastTouchEndAt = 0;
let audioContext = null;
let audioReady = false;
let audioUnlockPromise = null;
let pendingAudioUnlockSound = null;
let gearShiftTimer = null;
const gearPulseTimers = new Map();
const pedalTargets = {
  throttle: 0,
  brake: 0,
  clutch: 0,
};
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

function getStoredUserSettings() {
  try {
    const rawSettings = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    return rawSettings ? JSON.parse(rawSettings) : null;
  } catch {
    return null;
  }
}

function isSelectOptionValue(selectEl, value) {
  return [...selectEl.options].some((option) => option.value === value);
}

function setSelectValueFromSettings(selectEl, value) {
  if (typeof value === "string" && isSelectOptionValue(selectEl, value)) {
    selectEl.value = value;
  }
}

function setRangeValueFromSettings(rangeEl, value) {
  const nextValue = Number(value);
  const min = Number(rangeEl.min);
  const max = Number(rangeEl.max);

  if (Number.isFinite(nextValue) && nextValue >= min && nextValue <= max) {
    rangeEl.value = String(nextValue);
  }
}

function applyStoredUserSettings() {
  const settings = getStoredUserSettings();

  if (!settings || typeof settings !== "object") {
    return;
  }

  setSelectValueFromSettings(controlModeEl, settings.controlMode);
  setSelectValueFromSettings(steeringReturnModeEl, settings.steeringReturnMode);
  setRangeValueFromSettings(steeringReturnCustomEl, settings.steeringReturnCustom);
  setSelectValueFromSettings(steeringFeelEl, settings.steeringFeel);
  setSelectValueFromSettings(gameProfileEl, settings.gameProfile);
  setSelectValueFromSettings(gearboxOutputModeEl, settings.gearboxOutputMode);
  setSelectValueFromSettings(gearboxPositionEl, settings.gearboxPosition);
  setSelectValueFromSettings(gearboxTypeEl, settings.gearboxType);
}

function saveUserSettings() {
  const settings = {
    controlMode: controlModeEl.value,
    steeringReturnMode: steeringReturnModeEl.value,
    steeringReturnCustom: Number(steeringReturnCustomEl.value),
    steeringFeel: steeringFeelEl.value,
    gameProfile: gameProfileEl.value,
    gearboxOutputMode: gearboxOutputModeEl.value,
    gearboxPosition: gearboxPositionEl.value,
    gearboxType: gearboxTypeEl.value,
  };

  try {
    window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Browsers can reject storage in private mode or when site data is full.
  }
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

function preventPageZoomGestures() {
  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();

      if (now - lastTouchEndAt <= DOUBLE_TAP_ZOOM_WINDOW_MS) {
        event.preventDefault();
      }

      lastTouchEndAt = now;
    },
    { passive: false },
  );

  for (const gestureEvent of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(
      gestureEvent,
      (event) => {
        event.preventDefault();
      },
      { passive: false },
    );
  }
}

function resizeJoystickCanvas() {
  const rect = joystickCanvas.getBoundingClientRect();
  const size = Math.max(1, Math.round(Math.min(rect.width, rect.height)));
  const scale = window.devicePixelRatio || 1;
  const nextSize = Math.round(size * scale);

  if (joystickCanvas.width !== nextSize) {
    joystickCanvas.width = nextSize;
  }

  if (joystickCanvas.height !== nextSize) {
    joystickCanvas.height = nextSize;
  }

  drawPrimaryControl();
}

function scheduleJoystickCanvasResize() {
  window.requestAnimationFrame(resizeJoystickCanvas);
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

  steeringTargetAngle = clamp(
    steeringTargetAngle + delta,
    -STEERING_MAX_ROTATION_DEGREES,
    STEERING_MAX_ROTATION_DEGREES,
  );
  steeringLastPointerAngle = pointerAngle;
  updateSteeringAngleFromTarget();
}

function setSteeringAngle(nextAngle) {
  const nextSteeringAngle = clamp(
    nextAngle,
    -STEERING_MAX_ROTATION_DEGREES,
    STEERING_MAX_ROTATION_DEGREES,
  );

  steeringAngle = nextSteeringAngle;
  steeringTargetAngle = nextSteeringAngle;
  syncSteeringAxis();
}

function syncSteeringAxis() {
  state.axes.joystickX = roundAxis(steeringAngle / STEERING_MAX_ROTATION_DEGREES);
  state.axes.joystickY = 0;
  joystickReadout.textContent = `Steer ${steeringAngle.toFixed(0)} deg / X ${state.axes.joystickX.toFixed(2)}`;
  drawPrimaryControl();
}

function updateSteeringAngleFromTarget() {
  const previousAxis = state.axes.joystickX;
  const delta = steeringTargetAngle - steeringAngle;
  const maxStep = steeringFeelProfile.maxVelocity * (FRAME_INTERVAL_MS / 1000);
  const smoothedStep = delta * steeringFeelProfile.smoothing;
  const step = Number.isFinite(maxStep)
    ? clamp(smoothedStep, -maxStep, maxStep)
    : smoothedStep;

  if (Math.abs(delta) <= STEERING_CENTER_EPSILON_DEGREES) {
    steeringAngle = steeringTargetAngle;
  } else {
    steeringAngle = clamp(
      steeringAngle + step,
      -STEERING_MAX_ROTATION_DEGREES,
      STEERING_MAX_ROTATION_DEGREES,
    );
  }

  syncSteeringAxis();

  if (state.axes.joystickX !== previousAxis) {
    sendState();
  }
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
  steeringTargetAngle = 0;
  joystickReadout.textContent = "X 0.00 / Y 0.00";
  drawPrimaryControl();
  sendState();
}

function animateSteeringReturn() {
  if (controlMode !== "steering") {
    return;
  }

  if (joystickPointerId !== null) {
    if (Math.abs(steeringTargetAngle - steeringAngle) > STEERING_CENTER_EPSILON_DEGREES) {
      updateSteeringAngleFromTarget();
    }
    return;
  }

  if (steeringAngle === 0 && steeringTargetAngle === 0) {
    return;
  }

  const nextAngle = steeringTargetAngle + (0 - steeringTargetAngle) * steeringReturnRate * (FRAME_INTERVAL_MS / 1000);

  if (Math.abs(nextAngle) <= STEERING_CENTER_EPSILON_DEGREES) {
    setSteeringAngle(0);
  } else {
    steeringTargetAngle = nextAngle;
    updateSteeringAngleFromTarget();
  }

  if (state.axes.joystickX !== steeringLastSentAxis || steeringAngle === 0) {
    steeringLastSentAxis = state.axes.joystickX;
    sendState();
  }
}

function renderSpringAxis(axisEl) {
  const axisName = axisEl.dataset.axis;
  const percent = pedalTargets[axisName] * 100;
  const fill = axisEl.querySelector(".spring-axis-fill");
  const thumb = axisEl.querySelector(".spring-axis-thumb");

  fill.style.height = `${percent}%`;
  thumb.style.bottom = `${percent}%`;
  axisEl.setAttribute("aria-valuenow", String(Math.round(percent)));
}

function updatePedalsReadout() {
  pedalsReadout.textContent = `C ${state.axes.clutch.toFixed(2)} / B ${state.axes.brake.toFixed(2)} / T ${state.axes.throttle.toFixed(2)}`;
}

function animatePedals() {
  let didChange = false;

  for (const axisName of Object.keys(pedalTargets)) {
    const currentValue = state.axes[axisName];
    const targetValue = pedalTargets[axisName];
    const delta = targetValue - currentValue;

    if (Math.abs(delta) <= PEDAL_EPSILON) {
      if (currentValue !== targetValue) {
        state.axes[axisName] = targetValue;
        didChange = true;
      }
      continue;
    }

    const rate = targetValue > currentValue ? PEDAL_RESPONSE_RATE : PEDAL_RELEASE_RATE;
    const step = delta * rate * (FRAME_INTERVAL_MS / 1000);
    state.axes[axisName] = roundAxis(clamp(currentValue + step, 0, 1));
    didChange = true;
  }

  if (!didChange) {
    return;
  }

  updatePedalsReadout();
  sendState();
}

function updateSpringAxisFromPointer(axisEl, event) {
  const axisName = axisEl.dataset.axis;
  const rect = axisEl.getBoundingClientRect();
  const y = clamp(event.clientY - rect.top, 0, rect.height);
  pedalTargets[axisName] = roundAxis(1 - y / rect.height);

  renderSpringAxis(axisEl);
  updatePedalsReadout();
}

function resetSpringAxis(axisEl) {
  const axisName = axisEl.dataset.axis;
  springAxisPointers.delete(axisName);
  pedalTargets[axisName] = 0;
  renderSpringAxis(axisEl);
  updatePedalsReadout();
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

function updateControlMode({ reset = true } = {}) {
  controlMode = controlModeEl.value;
  primaryControlTitle.textContent = controlMode === "steering" ? "Steering" : "Joystick";

  if (reset) {
    resetJoystick();
  }
}

controlModeEl.addEventListener("change", () => {
  updateControlMode();
  saveUserSettings();
});

function updateSteeringReturnSetting() {
  const mode = steeringReturnModeEl.value;
  const isCustom = mode === "custom";

  steeringReturnCustomEl.disabled = !isCustom;
  steeringReturnRate = isCustom
    ? Number(steeringReturnCustomEl.value)
    : STEERING_RETURN_RATES[mode];
}

function updateSteeringFeelSetting() {
  steeringFeelProfile = STEERING_FEEL_PROFILES[steeringFeelEl.value] || STEERING_FEEL_PROFILES.direct;
  steeringTargetAngle = steeringAngle;
}

function updateGearboxPosition() {
  const position = gearboxPositionEl.value;
  controlDeck.classList.toggle("gearbox-left", position === "left");
  controlDeck.classList.toggle("gearbox-right", position === "right");
}

function updateGameProfile() {
  activeGameProfile = GAME_PROFILES[gameProfileEl.value] || GAME_PROFILES["motor-town"];
}

function updateGearboxOutputMode() {
  gearboxOutputMode = gearboxOutputModeEl.value;
  setSelectedGear(selectedGear);
}

function renderGearboxProfile() {
  activeGearboxType = gearboxTypeEl.value;
  activeGearboxProfile = GEARBOX_PROFILES[activeGearboxType] || GEARBOX_PROFILES["5-speed"];
  const profile = activeGearboxProfile;
  const gate = shifter.querySelector(".shift-gate");

  shifter.setAttribute("aria-label", profile.label);
  shifter.style.setProperty("--gear-columns", String(profile.columns));
  shifter.style.setProperty("--knob-col", String(Math.ceil(profile.columns / 2)));
  shifter.classList.toggle("direct", profile.kind === "direct");
  truckToggles.hidden = profile.kind !== "truck-h";
  reverseToggleWrap.hidden = !profile.detachedReverse;
  truckRangeHigh = false;
  truckSplitterHigh = false;

  shifter.querySelectorAll(".gear-slot").forEach((slot) => slot.remove());
  gate.replaceChildren();

  if (profile.kind !== "direct") {
    for (let column = 1; column <= profile.columns; column += 1) {
      const stem = document.createElement("div");
      stem.className = "gate-stem";
      stem.style.gridColumn = String(column);
      gate.append(stem);
    }
  }

  profile.slots.forEach((slot) => {
    const button = document.createElement("button");
    button.className = "gear-slot";
    button.type = "button";
    button.dataset.gear = slot.gear;
    button.style.setProperty("--col", String(slot.col));
    button.style.setProperty("--row", String(slot.row));
    button.textContent = getSlotLabel(slot);
    button.setAttribute("aria-label", getSlotLabel(slot));
    shifter.insertBefore(button, gearKnob);
  });

  gearSlotEls = [...document.querySelectorAll(".gear-slot")];
  resetGearSelection();
  updateTruckToggleButtons();
  updateReverseToggleButton();
}

function resetGearSelection() {
  selectedGear = null;
  knobPosition = { x: 0, y: 0 };
  setGearKnobOffset(0, 0);
  setSelectedGear(null);
}

function clearGearOutputTimers() {
  if (gearShiftTimer) {
    window.clearTimeout(gearShiftTimer);
    gearShiftTimer = null;
  }

  gearPulseTimers.forEach((timerId) => {
    window.clearTimeout(timerId);
  });
  gearPulseTimers.clear();
}

function clearGearButtons() {
  clearGearOutputTimers();

  GEAR_BUTTON_NAMES.forEach((buttonName) => {
    state.buttons[buttonName] = false;
  });
}

function pressGearButton(buttonName) {
  if (!buttonName) {
    return;
  }

  state.buttons[buttonName] = true;

  if (gearboxOutputMode !== "pulse") {
    return;
  }

  const timerId = window.setTimeout(() => {
    gearPulseTimers.delete(buttonName);
    state.buttons[buttonName] = false;
    sendState();
  }, GEAR_PULSE_DURATION_MS);

  gearPulseTimers.set(buttonName, timerId);
}

function isDriveGearButton(buttonName) {
  return Boolean(buttonName && buttonName !== "neutral");
}

function getSlotLabel(slot) {
  if (activeGearboxProfile.kind !== "truck-h") {
    return slot.label;
  }

  if (slot.gear === "truckSlotR") {
    return truckSplitterHigh ? "R2" : "R1";
  }

  if (slot.gear === "truckSlotL") {
    return "L";
  }

  const lowLabels = {
    truckSlot1: "1",
    truckSlot2: "2",
    truckSlot3: "3",
    truckSlot4: "4",
  };
  const highLabels = {
    truckSlot1: "5",
    truckSlot2: "6",
    truckSlot3: "7",
    truckSlot4: "8",
  };
  const baseLabel = truckRangeHigh ? highLabels[slot.gear] : lowLabels[slot.gear];

  if (!baseLabel) {
    return slot.label;
  }

  return truckRangeHigh ? `${baseLabel}${truckSplitterHigh ? "H" : "L"}` : baseLabel;
}

function updateGearSlotLabels() {
  gearSlotEls.forEach((slotEl) => {
    const slot = activeGearboxProfile.slots.find((candidate) => candidate.gear === slotEl.dataset.gear);
    if (!slot) {
      return;
    }

    const label = getSlotLabel(slot);
    slotEl.textContent = label;
    slotEl.setAttribute("aria-label", label);
  });
}

function setTruckToggleState(nextRangeHigh, nextSplitterHigh) {
  truckRangeHigh = nextRangeHigh;
  truckSplitterHigh = nextSplitterHigh;
  updateTruckToggleButtons();
  updateGearSlotLabels();

  if (activeGearboxProfile.kind === "truck-h") {
    setSelectedGear(selectedGear);
  }
}

function updateTruckToggleButtons() {
  truckRangeToggle.classList.toggle("active", truckRangeHigh);
  truckSplitterToggle.classList.toggle("active", truckSplitterHigh);
  truckRangeToggle.setAttribute("aria-pressed", String(truckRangeHigh));
  truckSplitterToggle.setAttribute("aria-pressed", String(truckSplitterHigh));
  truckRangeToggle.textContent = "Range";
  truckSplitterToggle.textContent = truckSplitterHigh ? "Splitter H" : "Splitter L";
}

function updateReverseToggleButton() {
  const isActive = selectedGear === "reverse";
  reverseToggle.classList.toggle("active", isActive);
  reverseToggle.setAttribute("aria-pressed", String(isActive));
}

function getTruckDirectGear(gearName) {
  return TRUCK_DIRECT_GEARS.find((gear) => gear.gear === gearName);
}

function getSelectedGearLabel(gearName) {
  if (!gearName) {
    return "N";
  }

  if (activeGearboxProfile.kind === "truck-h") {
    const slot = activeGearboxProfile.slots.find((candidate) => candidate.gear === gearName);
    return slot ? getSlotLabel(slot) : "N";
  }

  if (activeGearboxProfile.kind === "direct") {
    const directGear = getTruckDirectGear(gearName);
    return directGear ? directGear.label : "N";
  }

  if (gearName === "reverse") {
    return "R";
  }

  return gearName.replace("gear", "");
}

function getTruckSlotButton(gearName) {
  if (gearName === "truckSlotR") {
    return truckSplitterHigh ? "truckR2" : "truckR1";
  }

  if (gearName === "truckSlotL") {
    return "truckL";
  }

  const lowButtons = {
    truckSlot1: "gear1",
    truckSlot2: "gear2",
    truckSlot3: "gear3",
    truckSlot4: "gear4",
  };
  const highButtons = {
    truckSlot1: truckSplitterHigh ? "truck5H" : "truck5L",
    truckSlot2: truckSplitterHigh ? "truck6H" : "truck6L",
    truckSlot3: truckSplitterHigh ? "truck7H" : "truck7L",
    truckSlot4: truckSplitterHigh ? "truck8H" : "truck8L",
  };

  return truckRangeHigh ? highButtons[gearName] : lowButtons[gearName];
}

function getSelectedGearButton(gearName) {
  if (activeGearboxProfile.kind === "truck-h") {
    return gearName ? getTruckSlotButton(gearName) : "neutral";
  }

  if (gearName) {
    if (activeGearboxProfile.kind === "direct") {
      const directGear = getTruckDirectGear(gearName);
      return directGear ? directGear.button : null;
    }

    return gearName;
  }

  return "neutral";
}

function shouldSettleGearShift(previousButton, nextButton) {
  return (
    gearboxOutputMode === "hold" &&
    isDriveGearButton(previousButton) &&
    isDriveGearButton(nextButton) &&
    previousButton !== nextButton
  );
}

function applyGearOutput(nextButton) {
  const previousButton = activeGearButton;
  const shouldSettle = shouldSettleGearShift(previousButton, nextButton);

  clearGearButtons();

  if (shouldSettle) {
    activeGearButton = null;
    sendState();

    gearShiftTimer = window.setTimeout(() => {
      gearShiftTimer = null;
      clearGearButtons();
      pressGearButton(nextButton);
      activeGearButton = nextButton;
      sendState();
    }, GEAR_SHIFT_SETTLE_MS);
    return;
  }

  pressGearButton(nextButton);
  activeGearButton = nextButton;
  sendState();
}

function setSelectedGear(nextGear) {
  selectedGear = nextGear;

  gearSlotEls.forEach((slot) => {
    slot.classList.toggle("active", slot.dataset.gear === selectedGear);
  });

  updateReverseToggleButton();

  const label = getSelectedGearLabel(selectedGear);
  gearKnob.textContent = activeGearboxProfile.detachedReverse && selectedGear === "reverse" ? "N" : label;
  buttonReadout.textContent = selectedGear ? label : "Ready";
  applyGearOutput(getSelectedGearButton(selectedGear));
}

settingsToggle.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  const shouldOpen = settingsPanel.hidden;
  settingsPanel.hidden = !shouldOpen;
  settingsToggle.setAttribute("aria-expanded", String(shouldOpen));
});

settingsPanel.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

document.addEventListener("pointerdown", unlockAudio, { capture: true });

document.addEventListener("pointerdown", () => {
  settingsPanel.hidden = true;
  settingsToggle.setAttribute("aria-expanded", "false");
});

steeringReturnModeEl.addEventListener("change", () => {
  updateSteeringReturnSetting();
  saveUserSettings();
});
steeringReturnCustomEl.addEventListener("input", () => {
  updateSteeringReturnSetting();
  saveUserSettings();
});
steeringFeelEl.addEventListener("change", () => {
  updateSteeringFeelSetting();
  saveUserSettings();
});
gameProfileEl.addEventListener("change", () => {
  updateGameProfile();
  saveUserSettings();
});
gearboxOutputModeEl.addEventListener("change", () => {
  updateGearboxOutputMode();
  saveUserSettings();
});
gearboxPositionEl.addEventListener("change", () => {
  updateGearboxPosition();
  saveUserSettings();
});
gearboxTypeEl.addEventListener("change", () => {
  renderGearboxProfile();
  saveUserSettings();
});

function createAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
    audioReady = audioContext.state === "running";
    audioContext.addEventListener("statechange", () => {
      audioReady = audioContext.state === "running";
    });
  }

  return audioContext;
}

function playAudioUnlockPulse(ctx) {
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(40, now);
  gain.gain.setValueAtTime(0.0001, now);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.02);
}

function unlockAudio() {
  const ctx = createAudioContext();
  if (!ctx) {
    return Promise.resolve(false);
  }

  if (ctx.state === "running") {
    audioReady = true;
    return Promise.resolve(true);
  }

  if (audioUnlockPromise) {
    return audioUnlockPromise;
  }

  if (ctx.state !== "running" && typeof ctx.resume === "function") {
    playAudioUnlockPulse(ctx);
    audioUnlockPromise = ctx
      .resume()
      .then(() => {
        audioReady = ctx.state === "running";
        if (audioReady && pendingAudioUnlockSound) {
          const sound = pendingAudioUnlockSound;
          pendingAudioUnlockSound = null;
          playShiftSound(sound);
        }

        return audioReady;
      })
      .catch(() => {
        pendingAudioUnlockSound = null;
        return false;
      })
      .finally(() => {
        audioUnlockPromise = null;
      });

    return audioUnlockPromise;
  }

  return Promise.resolve(false);
}

function ensureAudioContext() {
  const ctx = createAudioContext();
  if (!ctx) {
    return null;
  }

  if (ctx.state !== "running") {
    unlockAudio();
  }

  return audioReady ? ctx : null;
}

function playShiftSound(kind) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    if (kind !== "tick") {
      pendingAudioUnlockSound = kind;
      unlockAudio();
    }

    return;
  }

  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const config = {
    tick: { frequency: 850, duration: 0.025, volume: 0.045 },
    clack: { frequency: 420, duration: 0.055, volume: 0.09 },
    neutral: { frequency: 620, duration: 0.035, volume: 0.055 },
  }[kind];

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(config.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.55, now + config.duration);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(config.volume, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + config.duration + 0.01);
}

function playGateTick(nextZone) {
  const now = Date.now();
  if (nextZone === lastGateZone || now - lastShiftSoundAt < SHIFTER_TICK_COOLDOWN_MS) {
    return;
  }

  lastGateZone = nextZone;
  lastShiftSoundAt = now;
  playShiftSound("tick");
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
  const center = getShifterCenter();

  return gearSlotEls.map((slot) => {
    const rect = slot.getBoundingClientRect();

    return {
      gear: slot.dataset.gear,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      offsetX: rect.left + rect.width / 2 - center.x,
      offsetY: rect.top + rect.height / 2 - center.y,
    };
  });
}

function getShifterMetrics() {
  const center = getShifterCenter();
  const shifterRect = shifter.getBoundingClientRect();
  const slots = getGearSlots();
  const columns = [];

  slots.forEach((slot) => {
    if (!columns.some((column) => Math.abs(column - slot.offsetX) < 1)) {
      columns.push(slot.offsetX);
    }
  });

  columns.sort((a, b) => a - b);

  return {
    center,
    slots,
    columns,
    minX: columns[0],
    maxX: columns[columns.length - 1],
    minY: Math.min(...slots.map((slot) => slot.offsetY)),
    maxY: Math.max(...slots.map((slot) => slot.offsetY)),
    columnBand: shifterRect.width * SHIFTER_COLUMN_BAND_RATIO,
    neutralBand: shifterRect.height * SHIFTER_NEUTRAL_BAND_RATIO,
  };
}

function getNearestColumn(x, metrics = getShifterMetrics()) {
  return metrics.columns.reduce((nearest, column) => {
    return Math.abs(column - x) < Math.abs(nearest - x) ? column : nearest;
  });
}

function getGateZone(metrics = getShifterMetrics()) {
  const nearestColumn = getNearestColumn(knobPosition.x, metrics);
  const columnIndex = metrics.columns.indexOf(nearestColumn);

  if (Math.abs(knobPosition.y) <= metrics.neutralBand) {
    return `neutral-${columnIndex}`;
  }

  return `${columnIndex}-${knobPosition.y < 0 ? "top" : "bottom"}`;
}

function getNearestGearSlot() {
  const shifterRect = shifter.getBoundingClientRect();
  const metrics = getShifterMetrics();
  const snapDistance = Math.min(shifterRect.width, shifterRect.height) * SHIFTER_SLOT_SNAP_RATIO;
  const nearest = metrics.slots.reduce((current, slot) => {
    const distance = Math.hypot(knobPosition.x - slot.offsetX, knobPosition.y - slot.offsetY);

    if (!current || distance < current.distance) {
      return { ...slot, distance };
    }

    return current;
  }, null);

  return nearest && nearest.distance <= snapDistance ? nearest : null;
}

function updateKnobFromDelta(dx, dy) {
  const metrics = getShifterMetrics();
  const wasInNeutral = Math.abs(knobPosition.y) <= metrics.neutralBand;
  let nextX = knobPosition.x;
  let nextY = knobPosition.y;

  if (wasInNeutral) {
    nextX = clamp(nextX + dx, metrics.minX, metrics.maxX);
    const nearestColumn = getNearestColumn(nextX, metrics);
    const isNearColumn = Math.abs(nextX - nearestColumn) <= metrics.columnBand;
    const wantsVertical = Math.abs(dx) <= Math.abs(dy) * SHIFTER_VERTICAL_ENTRY_RATIO;

    if (isNearColumn && wantsVertical) {
      nextX += (nearestColumn - nextX) * 0.55;
      nextY = clamp(nextY + dy * 0.82, metrics.minY, metrics.maxY);
    } else {
      nextY *= 0.45;
    }
  } else {
    const lockedColumn = getNearestColumn(nextX, metrics);
    nextX += (lockedColumn - nextX) * 0.7;
    nextY = clamp(nextY + dy, metrics.minY, metrics.maxY);

    if (Math.abs(nextY) <= metrics.neutralBand) {
      nextY = 0;
      nextX = clamp(nextX + dx * 0.75, metrics.minX, metrics.maxX);
    }
  }

  knobPosition = {
    x: Math.abs(nextX) < 0.5 ? 0 : nextX,
    y: Math.abs(nextY) < 0.5 ? 0 : nextY,
  };

  setGearKnobOffset(knobPosition.x, knobPosition.y);
  playGateTick(getGateZone(metrics));
}

function updateShifterDrag(event) {
  if (!shifterLastPointer) {
    shifterLastPointer = { x: event.clientX, y: event.clientY };
    return;
  }

  const dx = event.clientX - shifterLastPointer.x;
  const dy = event.clientY - shifterLastPointer.y;
  shifterLastPointer = { x: event.clientX, y: event.clientY };
  updateKnobFromDelta(dx, dy);
}

function releaseShifter(event) {
  shifterPointerId = null;
  shifterLastPointer = null;
  const nearest = getNearestGearSlot();

  if (!nearest) {
    setSelectedGear(null);
    knobPosition = { x: 0, y: 0 };
    setGearKnobOffset(0, 0);
    playShiftSound("neutral");
    return;
  }

  setSelectedGear(nearest.gear);
  knobPosition = { x: nearest.offsetX, y: nearest.offsetY };
  setGearKnobOffset(knobPosition.x, knobPosition.y);
  playShiftSound("clack");
}

shifter.addEventListener("pointerdown", (event) => {
  if (activeGearboxProfile.kind === "direct") {
    const slot = event.target.closest(".gear-slot");
    if (slot) {
      ensureAudioContext();
      if (selectedGear === slot.dataset.gear) {
        setSelectedGear(null);
        playShiftSound("neutral");
      } else {
        setSelectedGear(slot.dataset.gear);
        playShiftSound("clack");
      }
    }
    return;
  }

  ensureAudioContext();
  if (activeGearboxProfile.detachedReverse && selectedGear === "reverse") {
    setSelectedGear(null);
  }

  shifterPointerId = event.pointerId;
  shifterLastPointer = { x: event.clientX, y: event.clientY };
  shifter.setPointerCapture(event.pointerId);
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
  shifterLastPointer = null;
  knobPosition = { x: 0, y: 0 };
  setSelectedGear(null);
  setGearKnobOffset(0, 0);
});

truckRangeToggle.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  setTruckToggleState(!truckRangeHigh, truckSplitterHigh);
});

truckSplitterToggle.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  setTruckToggleState(truckRangeHigh, !truckSplitterHigh);
});

reverseToggle.addEventListener("pointerdown", (event) => {
  event.stopPropagation();

  if (!activeGearboxProfile.detachedReverse) {
    return;
  }

  if (selectedGear === "reverse") {
    setSelectedGear(null);
    return;
  }

  knobPosition = { x: 0, y: 0 };
  setGearKnobOffset(0, 0);
  setSelectedGear("reverse");
  playShiftSound("clack");
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

window.addEventListener("resize", scheduleJoystickCanvasResize);
window.addEventListener("orientationchange", scheduleJoystickCanvasResize);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", scheduleJoystickCanvasResize);
  window.visualViewport.addEventListener("scroll", scheduleJoystickCanvasResize);
}

if (window.ResizeObserver) {
  const joystickCanvasObserver = new ResizeObserver(scheduleJoystickCanvasResize);
  joystickCanvasObserver.observe(joystickCanvas);
  joystickCanvasObserver.observe(controlDeck);
}

resizeJoystickCanvas();
springAxisEls.forEach(renderSpringAxis);
updatePedalsReadout();
preventPageZoomGestures();
updateControlMode({ reset: false });
updateSteeringReturnSetting();
updateSteeringFeelSetting();
updateGameProfile();
updateGearboxPosition();
renderGearboxProfile();
connect();
window.setInterval(animateSteeringReturn, FRAME_INTERVAL_MS);
window.setInterval(animatePedals, FRAME_INTERVAL_MS);
window.setInterval(sendState, SEND_INTERVAL_MS);
