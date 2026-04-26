const statusEl = document.querySelector("#connectionStatus");
const joystickCanvas = document.querySelector("#joystickCanvas");
const joystickReadout = document.querySelector("#joystickReadout");
const pedalsReadout = document.querySelector("#pedalsReadout");
const springAxisEls = [...document.querySelectorAll(".spring-axis")];
const buttonReadout = document.querySelector("#buttonReadout");
const buttonEls = [...document.querySelectorAll(".control-button")];

const clientId = getClientId();
const state = {
  axes: {
    joystickX: 0,
    joystickY: 0,
    throttle: 0,
    brake: 0,
  },
  buttons: {
    fire: false,
    gear: false,
    boost: false,
    mode: false,
  },
};

let socket = null;
let reconnectTimer = null;
let joystickPointerId = null;
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
  drawJoystick();
}

function drawJoystick() {
  const ctx = joystickCanvas.getContext("2d");
  const width = joystickCanvas.width;
  const height = joystickCanvas.height;
  const size = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;
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

function updateJoystickFromPointer(event) {
  const rect = joystickCanvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = Math.min(rect.width, rect.height) * 0.36;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const distance = Math.hypot(dx, dy);
  const limitedDistance = Math.min(distance, radius);
  const angle = Math.atan2(dy, dx);

  state.axes.joystickX = roundAxis((Math.cos(angle) * limitedDistance) / radius);
  state.axes.joystickY = roundAxis((Math.sin(angle) * limitedDistance) / radius);
  joystickReadout.textContent = `X ${state.axes.joystickX.toFixed(2)} / Y ${state.axes.joystickY.toFixed(2)}`;
  drawJoystick();
  sendState();
}

function resetJoystick() {
  joystickPointerId = null;
  state.axes.joystickX = 0;
  state.axes.joystickY = 0;
  joystickReadout.textContent = "X 0.00 / Y 0.00";
  drawJoystick();
  sendState();
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
  pedalsReadout.textContent = `T ${state.axes.throttle.toFixed(2)} / B ${state.axes.brake.toFixed(2)}`;
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
  updateJoystickFromPointer(event);
});

joystickCanvas.addEventListener("pointermove", (event) => {
  if (event.pointerId === joystickPointerId) {
    updateJoystickFromPointer(event);
  }
});

joystickCanvas.addEventListener("pointerup", (event) => {
  if (event.pointerId === joystickPointerId) {
    resetJoystick();
  }
});

joystickCanvas.addEventListener("pointercancel", resetJoystick);
joystickCanvas.addEventListener("lostpointercapture", resetJoystick);

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
window.setInterval(sendState, 100);
