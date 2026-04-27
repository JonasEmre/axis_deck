export function mountKsp() {
  const statusEl = document.querySelector("#kspConnectionStatus");
  const vesselNameEl = document.querySelector("#kspVesselName");
  const speedTextEl = document.querySelector("#kspSpeedText");
  const altitudeTextEl = document.querySelector("#kspAltitudeText");
  const apoapsisTextEl = document.querySelector("#kspApoapsisText");
  const periapsisTextEl = document.querySelector("#kspPeriapsisText");
  const throttleEl = document.querySelector("#kspThrottleSlider");
  const throttleOutputEl = document.querySelector("#kspThrottleOutput");
  const translateForwardEl = document.querySelector("#kspTranslateForwardSlider");
  const translateForwardOutputEl = document.querySelector("#kspTranslateForwardOutput");
  const rollEl = document.querySelector("#kspRollSlider");
  const pitchYawPad = document.querySelector("#kspPitchYawPad");
  const translatePad = document.querySelector("#kspTranslatePad");
  const toggleEls = [...document.querySelectorAll(".ksp-toggle[data-button]")];
  const gaugeEls = [...document.querySelectorAll(".ksp-gauge[data-gauge]")];

const SEND_INTERVAL_MS = 100;
const BUTTON_PULSE_MS = 140;
const CONTROL_KNOB_COLOR = "#2A94D5";
const ECAM_GREEN = "#32FF55";
const ECAM_RED = "#FF3333";
const clientId = getClientId();
  const state = {
    axes: {
      joystickX: 0,
      joystickY: 0,
      throttle: 0,
      brake: 0,
      clutch: 0,
      roll: 0,
      translateForward: 0,
      translateX: 0,
      translateY: 0,
    },
    buttons: {
      sas: false,
      rcs: false,
      lights: false,
      gear: false,
      stage: false,
    },
  };
  const telemetry = {
    vesselName: "Waiting Telemetry",
    speed: 0,
    altitude: 0,
    apoapsisAltitude: 0,
    periapsisAltitude: 0,
    verticalSpeed: 0,
    timeToApoapsis: 0,
    timeToPeriapsis: 0,
    resources: {
      solidFuel: 0,
      liquidFuel: 0,
      oxidizer: 0,
      monoPropellant: 0,
      electricCharge: 0,
      intakeAir: 0,
      gForce: 0,
      verticalSpeed: 0.5,
    },
  };
  const gaugeDefinitions = {
    solidFuel: { valueType: "percent", dangerSide: "low", dangerSize: 0.18 },
    liquidFuel: { valueType: "percent", dangerSide: "low", dangerSize: 0.16 },
    oxidizer: { valueType: "percent", dangerSide: "low", dangerSize: 0.16 },
    monoPropellant: { valueType: "percent", dangerSide: "low", dangerSize: 0.12 },
    electricCharge: { valueType: "percent", dangerSide: "low", dangerSize: 0.22 },
    intakeAir: { valueType: "percent", dangerSide: "low", dangerSize: 0.1 },
    gForce: { valueType: "g", dangerSide: "high", dangerSize: 0.28 },
    verticalSpeed: { valueType: "signed" },
  };
  let gauges = [];
  const pads = {
    pitchYaw: {
      canvas: pitchYawPad,
      pointerId: null,
      x: 0,
      y: 0,
      label: "Pitch / Yaw",
    },
    translate: {
      canvas: translatePad,
      pointerId: null,
      x: 0,
      y: 0,
      label: "Translate",
    },
  };

  let controlSocket = null;
  let telemetrySocket = null;
  let controlReconnectTimer = null;
  let telemetryReconnectTimer = null;
  let controlConnected = false;
  let telemetryStatus = "disconnected";
  const buttonPulseTimers = new Map();

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

  function updateConnectionStatus() {
    if (!controlConnected) {
      setStatus("Control Offline", "disconnected");
      return;
    }

    if (telemetryStatus === "connected") {
      setStatus("KSP Connected", "connected");
      return;
    }

    if (telemetryStatus === "connecting") {
      setStatus("KSP Connecting", "");
      return;
    }

    if (telemetryStatus === "waiting_vessel") {
      setStatus("Waiting Vessel", "disconnected");
      return;
    }

    setStatus("Waiting Telemetry", "disconnected");
  }

  function connectControl() {
    window.clearTimeout(controlReconnectTimer);
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/control`;

    controlConnected = false;
    updateConnectionStatus();
    controlSocket = new WebSocket(wsUrl);

    controlSocket.addEventListener("open", () => {
      controlConnected = true;
      updateConnectionStatus();
      sendState();
    });

    controlSocket.addEventListener("close", () => {
      controlConnected = false;
      updateConnectionStatus();
      controlReconnectTimer = window.setTimeout(connectControl, 1500);
    });

    controlSocket.addEventListener("error", () => {
      controlConnected = false;
      updateConnectionStatus();
      controlSocket.close();
    });
  }

  function connectTelemetry() {
    window.clearTimeout(telemetryReconnectTimer);
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/telemetry/ksp`;

    telemetryStatus = "connecting";
    updateConnectionStatus();
    telemetrySocket = new WebSocket(wsUrl);

    telemetrySocket.addEventListener("message", (event) => {
      try {
        applyTelemetryMessage(JSON.parse(event.data));
      } catch {
        telemetryStatus = "error";
        updateConnectionStatus();
      }
    });

    telemetrySocket.addEventListener("close", () => {
      telemetryStatus = "disconnected";
      updateConnectionStatus();
      telemetryReconnectTimer = window.setTimeout(connectTelemetry, 1500);
    });

    telemetrySocket.addEventListener("error", () => {
      telemetryStatus = "error";
      updateConnectionStatus();
      telemetrySocket.close();
    });
  }

  function sendState(updateType = "full") {
    if (!controlSocket || controlSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    controlSocket.send(
      JSON.stringify({
        type: "control_state",
        updateType,
        moduleId: "ksp",
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

  function formatNumber(value, fractionDigits = 0) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
    }).format(value);
  }

  function formatDuration(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
      return "--:--";
    }

    const seconds = Math.floor(totalSeconds % 60);
    const minutes = Math.floor((totalSeconds / 60) % 60);
    const hours = Math.floor(totalSeconds / 3600);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function resizeCanvasToDisplaySize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * scale));
    const height = Math.max(1, Math.round(rect.height * scale));

    if (canvas.width !== width) {
      canvas.width = width;
    }

    if (canvas.height !== height) {
      canvas.height = height;
    }
  }

  class KspGauge {
    constructor(gaugeEl, options = {}) {
      this.gaugeEl = gaugeEl;
      this.canvas = gaugeEl.querySelector("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.valueType = options.valueType || "percent";
      this.dangerSide = options.dangerSide || null;
      this.dangerSize = Number(options.dangerSize || 0);
    }

    draw(rawValue) {
      resizeCanvasToDisplaySize(this.canvas);

      const value = clamp(rawValue, 0, 1);
      const width = this.canvas.width;
      const height = this.canvas.height;
      const size = Math.min(width, height * 1.82);
      const cx = width / 2;
      const cy = height * 0.6;
      const radius = size * 0.38;
      const startAngle = Math.PI;
      const endAngle = Math.PI * 2;
      const needleAngle = startAngle + value * (endAngle - startAngle);

      this.ctx.clearRect(0, 0, width, height);
      this.ctx.lineCap = "round";

      this.drawMainArc(cx, cy, radius, startAngle, endAngle, size);
      this.drawDangerArc(cx, cy, radius, startAngle, endAngle);
      this.drawMarkers(cx, cy, radius, startAngle, endAngle, size);
      this.drawNeedle(cx, cy, radius, needleAngle, size);
      this.drawValue(cx, cy + radius * 0.48, size, value);
    }

    drawMainArc(cx, cy, radius, startAngle, endAngle, size) {
      this.ctx.strokeStyle = "#f4f6f2";
      this.ctx.lineWidth = Math.max(3, size * 0.022);
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, startAngle, endAngle);
      this.ctx.stroke();
    }

    drawDangerArc(cx, cy, radius, startAngle, endAngle) {
      if (!this.dangerSide || this.dangerSize <= 0) {
        return;
      }

      const dangerSize = clamp(this.dangerSize, 0, 1);
      const arcRange = endAngle - startAngle;
      this.ctx.strokeStyle = ECAM_RED;
      this.ctx.beginPath();

      if (this.dangerSide === "low") {
        this.ctx.arc(cx, cy, radius, startAngle, startAngle + arcRange * dangerSize);
      } else {
        this.ctx.arc(cx, cy, radius, endAngle - arcRange * dangerSize, endAngle);
      }

      this.ctx.stroke();
    }

    drawMarkers(cx, cy, radius, startAngle, endAngle, size) {
      this.ctx.strokeStyle = "#f4f6f2";
      this.ctx.lineWidth = Math.max(3, size * 0.022);
      [0, 0.5, 1].forEach((tick) => {
        const angle = startAngle + tick * (endAngle - startAngle);
        const inner = radius * 0.84;
        const outer = radius * 0.99;
        this.ctx.beginPath();
        this.ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        this.ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
        this.ctx.stroke();
      });
    }

    drawNeedle(cx, cy, radius, needleAngle, size) {
      this.ctx.strokeStyle = ECAM_GREEN;
      this.ctx.lineWidth = Math.max(3, size * 0.022);
      this.ctx.beginPath();
      this.ctx.moveTo(cx - Math.cos(needleAngle) * radius * 0.1, cy - Math.sin(needleAngle) * radius * 0.1);
      this.ctx.lineTo(cx + Math.cos(needleAngle) * radius * 1.1, cy + Math.sin(needleAngle) * radius * 1.1);
      this.ctx.stroke();

      this.ctx.fillStyle = ECAM_GREEN;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, Math.max(2, size * 0.014), 0, Math.PI * 2);
      this.ctx.fill();
    }

    drawValue(x, y, size, value) {
      this.ctx.fillStyle = ECAM_GREEN;
      this.ctx.font = `800 ${Math.max(20, size * 0.16)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(this.formatValue(value), x, y);
    }

    formatValue(value) {
      if (this.valueType === "g") {
        return (value * 6).toFixed(1);
      }

      if (this.valueType === "signed") {
        return `${Math.round(value * 200 - 100)}`;
      }

      return `${Math.round(value * 100)}`;
    }
  }

  gauges = gaugeEls.map((gaugeEl) => {
    const definition = gaugeDefinitions[gaugeEl.dataset.gauge] || {};
    return new KspGauge(gaugeEl, definition);
  });

  function drawPad(pad) {
    const canvas = pad.canvas;
    const ctx = canvas.getContext("2d");
    resizeCanvasToDisplaySize(canvas);

    const width = canvas.width;
    const height = canvas.height;
    const size = Math.min(width, height);
    const cx = width / 2;
    const cy = height / 2;
    const radius = size * 0.36;
    const knobRadius = size * 0.1;
    const knobX = cx + pad.x * radius;
    const knobY = cy + pad.y * radius;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#33424d";
    ctx.lineWidth = Math.max(2, size * 0.012);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#25313b";
    ctx.lineWidth = Math.max(1, size * 0.006);
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    ctx.fillStyle = CONTROL_KNOB_COLOR;
    ctx.beginPath();
    ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(217, 255, 245, 0.62)";
    ctx.lineWidth = Math.max(2, size * 0.01);
    ctx.stroke();
  }

  function renderTelemetry() {
    vesselNameEl.textContent = telemetry.vesselName;
    speedTextEl.textContent = `${formatNumber(telemetry.speed, 1)} m/s`;
    altitudeTextEl.textContent = `${formatNumber(telemetry.altitude, 0)} m`;
    apoapsisTextEl.textContent = `${formatNumber(telemetry.apoapsisAltitude, 0)} m`;
    periapsisTextEl.textContent = `${formatNumber(telemetry.periapsisAltitude, 0)} m`;

    gauges.forEach((gauge) => {
      gauge.draw(telemetry.resources[gauge.gaugeEl.dataset.gauge] ?? 0);
    });
  }

  function applyTelemetryMessage(message) {
    if (!message || message.type !== "ksp_telemetry") {
      return;
    }

    telemetryStatus = message.status || "disconnected";

    if (telemetryStatus !== "connected") {
      telemetry.vesselName = telemetryStatus === "waiting_vessel" ? "No Active Vessel" : "Waiting Telemetry";
      telemetry.speed = 0;
      telemetry.altitude = 0;
      telemetry.apoapsisAltitude = 0;
      telemetry.periapsisAltitude = 0;
      telemetry.timeToApoapsis = 0;
      telemetry.timeToPeriapsis = 0;
      telemetry.verticalSpeed = 0;
      telemetry.resources = {
        solidFuel: 0,
        liquidFuel: 0,
        oxidizer: 0,
        monoPropellant: 0,
        electricCharge: 0,
        intakeAir: 0,
        gForce: 0,
        verticalSpeed: 0.5,
      };
      updateConnectionStatus();
      renderTelemetry();
      return;
    }

    telemetry.vesselName = message.vesselName || "Unnamed Vessel";
    telemetry.speed = Number(message.speed) || 0;
    telemetry.altitude = Number(message.altitude) || 0;
    telemetry.apoapsisAltitude = Number(message.apoapsisAltitude) || 0;
    telemetry.periapsisAltitude = Number(message.periapsisAltitude) || 0;
    telemetry.timeToApoapsis = Number(message.timeToApoapsis) || 0;
    telemetry.timeToPeriapsis = Number(message.timeToPeriapsis) || 0;
    telemetry.verticalSpeed = Number(message.verticalSpeed) || 0;
    telemetry.resources = {
      ...telemetry.resources,
      ...(message.resources || {}),
      verticalSpeed: normalizeVsi(Number(message.verticalSpeed) || 0),
    };

    updateConnectionStatus();
    renderTelemetry();
  }

  function setPadFromPointer(pad, event) {
    const rect = pad.canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.36;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const distance = Math.hypot(dx, dy);
    const limitedDistance = Math.min(distance, radius);
    const angle = Math.atan2(dy, dx);

    pad.x = roundAxis((Math.cos(angle) * limitedDistance) / radius);
    pad.y = roundAxis((Math.sin(angle) * limitedDistance) / radius);

    if (pad === pads.pitchYaw) {
      state.axes.joystickX = pad.x;
      state.axes.joystickY = roundAxis(-pad.y);
    } else {
      state.axes.translateX = pad.x;
      state.axes.translateY = roundAxis(-pad.y);
    }

    drawPad(pad);
    sendState();
  }

  function resetPad(pad) {
    pad.pointerId = null;
    pad.x = 0;
    pad.y = 0;

    if (pad === pads.pitchYaw) {
      state.axes.joystickX = 0;
      state.axes.joystickY = 0;
    } else {
      state.axes.translateX = 0;
      state.axes.translateY = 0;
    }

    drawPad(pad);
    sendState();
  }

  function bindPad(pad) {
    pad.canvas.addEventListener("pointerdown", (event) => {
      pad.pointerId = event.pointerId;
      pad.canvas.setPointerCapture(event.pointerId);
      setPadFromPointer(pad, event);
    });

    pad.canvas.addEventListener("pointermove", (event) => {
      if (pad.pointerId === event.pointerId) {
        setPadFromPointer(pad, event);
      }
    });

    pad.canvas.addEventListener("pointerup", (event) => {
      if (pad.pointerId === event.pointerId) {
        resetPad(pad);
      }
    });

    pad.canvas.addEventListener("pointercancel", () => resetPad(pad));
    pad.canvas.addEventListener("lostpointercapture", () => resetPad(pad));
  }

  function updateThrottle() {
    state.axes.throttle = Number(throttleEl.value) / 100;
    updateThrottleFill(throttleEl, state.axes.throttle);
    throttleOutputEl.textContent = `${Math.round(state.axes.throttle * 100)}%`;
    sendState();
  }

  function updateTranslateForward() {
    const normalized = Number(translateForwardEl.value) / 100;
    state.axes.translateForward = roundAxis(normalized);
    updateBipolarFill(translateForwardEl, normalized);
    translateForwardOutputEl.textContent = `${Math.round(normalized * 100)}%`;
    sendState();
  }

  function updateRoll() {
    const normalized = Number(rollEl.value) / 100;
    state.axes.roll = roundAxis(normalized);
    updateBipolarFill(rollEl, normalized);
    sendState();
  }

  function updateThrottleFill(inputEl, normalized) {
    inputEl.style.setProperty("--fill-value", `${clamp(normalized, 0, 1) * 100}%`);
  }

  function updateBipolarFill(inputEl, normalized) {
    const value = clamp(normalized, -1, 1);
    inputEl.style.setProperty("--fill-positive", `${Math.max(0, value) * 50}%`);
    inputEl.style.setProperty("--fill-negative", `${Math.max(0, -value) * 50}%`);
  }

  function normalizeVsi(verticalSpeed) {
    const direction = Math.sign(verticalSpeed);
    const magnitude = Math.min(1000, Math.abs(verticalSpeed));
    const normalizedMagnitude = Math.log10(magnitude + 1) / Math.log10(1001);
    return clamp(0.5 + direction * normalizedMagnitude * 0.5, 0, 1);
  }

  toggleEls.forEach((button) => {
    const buttonName = button.dataset.button;

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      window.clearTimeout(buttonPulseTimers.get(buttonName));
      state.buttons[buttonName] = true;
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");
      sendState("buttons");

      const timer = window.setTimeout(() => {
        state.buttons[buttonName] = false;
        button.classList.remove("active");
        button.setAttribute("aria-pressed", "false");
        sendState("buttons");
        buttonPulseTimers.delete(buttonName);
      }, BUTTON_PULSE_MS);
      buttonPulseTimers.set(buttonName, timer);
    });
  });

  throttleEl.addEventListener("input", updateThrottle);
  rollEl.addEventListener("input", updateRoll);
  rollEl.addEventListener("pointerup", () => {
    rollEl.value = "0";
    updateRoll();
  });
  rollEl.addEventListener("pointercancel", () => {
    rollEl.value = "0";
    updateRoll();
  });
  translateForwardEl.addEventListener("input", updateTranslateForward);
  translateForwardEl.addEventListener("pointerup", () => {
    translateForwardEl.value = "0";
    updateTranslateForward();
  });
  translateForwardEl.addEventListener("pointercancel", () => {
    translateForwardEl.value = "0";
    updateTranslateForward();
  });

  Object.values(pads).forEach(bindPad);

  window.addEventListener("resize", () => {
    Object.values(pads).forEach(drawPad);
    renderTelemetry();
  });

  Object.values(pads).forEach(drawPad);
  updateThrottle();
  updateRoll();
  updateTranslateForward();
  renderTelemetry();
  connectControl();
  connectTelemetry();
  window.setInterval(sendState, SEND_INTERVAL_MS);
}
