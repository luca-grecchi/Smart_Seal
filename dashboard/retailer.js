const socket = io();

const state = {
  session: null
};

window.smartSeal = {
  get session() { return state.session; },
  setSession,
  request
};

// ── Tab navigation ─────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.tab).classList.add("active");
  });
});

// ── Nuova sessione ─────────────────────────────────────────────
document.getElementById("create-session").addEventListener("click", async () => {
  const session = await request("/api/seal", {
    method: "POST",
    body: { device_id: "SIM-001", timestamp: Date.now() }
  });
  document.getElementById("session-id").value = session.session_id;
  await loadSession(session.session_id);
});

// ── Carica sessione esistente ──────────────────────────────────
document.getElementById("load-session").addEventListener("click", async () => {
  await loadSession(document.getElementById("session-id").value.trim());
});

// ── Reset ──────────────────────────────────────────────────────
document.getElementById("reset-session").addEventListener("click", async () => {
  if (!state.session) return;
  const session = await request(`/api/session/${state.session.session_id}/reset`, { method: "POST" });
  document.getElementById("session-id").value = session.session_id;
  setSession(session);
});

// ── Scenario runner ────────────────────────────────────────────
document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => runScenario(button.dataset.scenario));
});

async function runScenario(name) {
  const session = await request("/api/seal", {
    method: "POST",
    body: { device_id: `SIM-${name}`, timestamp: Date.now() }
  });
  document.getElementById("session-id").value = session.session_id;
  await loadSession(session.session_id);

  // Tutti gli scenari partono da SEALED e simulano movimento
  await sendEvent("IN_TRANSIT", { accel_norm: 1.8 });

  if (name === "A" || name === "D") {
    // Corriere consegna a casa del cliente, cliente si autentica
    await request("/api/courier/scan", {
      method: "POST",
      body: { session_id: session.session_id, courier_otp: session.courier_otp, gps: "client_home" }
    });
    await request("/api/client/authenticate", {
      method: "POST",
      body: { session_id: session.session_id, client_otp: session.client_otp, gps: "client_home" }
    });
    await sendEvent("BOX_OPENED", { light: 850, accel_norm: 0.2 });
    await sendEvent("PRODUCT_REMOVED", { light: 850, accel_norm: 0.1, product_present: false });

    if (name === "D") {
      // Cliente dichiara pacco vuoto dopo che il logic lock ha già registrato PRODUCT_REMOVED
      await request("/api/client/dispute", {
        method: "POST",
        body: { session_id: session.session_id, type: "EMPTY_BOX" }
      });
    }
  }

  if (name === "B") {
    // Corriere apre dalla propria sede — GPS sbagliato, nessun client auth
    await request("/api/courier/scan", {
      method: "POST",
      body: { session_id: session.session_id, courier_otp: session.courier_otp, gps: "courier_depot" }
    });
    await sendEvent("BOX_OPENED", { light: 850, accel_norm: 0.2 });
  }

  if (name === "C") {
    // Corriere consegna correttamente, ma qualcuno apre dopo un gap temporale (porch piracy)
    await request("/api/courier/scan", {
      method: "POST",
      body: { session_id: session.session_id, courier_otp: session.courier_otp, gps: "client_home" }
    });
    await new Promise((resolve) => setTimeout(resolve, 5200)); // gap simulato 5s
    await sendEvent("BOX_OPENED", { light: 850, accel_norm: 0.2 });
  }

  await loadSession(session.session_id);
}

// ── Helpers ────────────────────────────────────────────────────
async function sendEvent(event, sensorData = {}) {
  return request("/api/event", {
    method: "POST",
    body: {
      session_id: state.session.session_id,
      source: "simulator",
      event,
      timestamp: Date.now(),
      sensor_data: {
        light: 120,          // default: scatola chiusa, luce bassa
        accel_norm: 0.98,    // default: fermo
        product_present: true,
        ...sensorData
      }
    }
  });
}

async function loadSession(sessionId) {
  if (!sessionId) return;
  const session = await request(`/api/session/${sessionId}`);
  setSession(session);
}

function setSession(session) {
  state.session = session;
  document.getElementById("state").textContent = session.state || "-";
  document.getElementById("verdict").textContent = session.verdict?.code || "-";
  document.getElementById("courier-otp").textContent = session.courier_otp || "-";
  document.getElementById("client-otp").textContent = session.client_otp || "-";
  document.getElementById("courier-otp-input").value = session.courier_otp || "";
  document.getElementById("client-otp-input").value = session.client_otp || "";
  document.getElementById("session-json").textContent = JSON.stringify(session, null, 2);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    log("http error", data);
    throw new Error(data.error || response.statusText);
  }
  return data;
}

function log(label, payload) {
  const line = `[${new Date().toLocaleTimeString()}] ${label} ${JSON.stringify(payload)}\n`;
  const target = document.getElementById("event-log");
  target.textContent = line + target.textContent;
}

// ── WebSocket ──────────────────────────────────────────────────
socket.on("session.update", (p) => { if (p?.session_id) setSession(p); log("session.update", p); });
socket.on("device.event", (p) => log("device.event", p));
socket.on("command.created", (p) => log("command.created", p));
socket.on("verdict.computed", (p) => log("verdict.computed", p));
socket.on("error.event", (p) => log("error.event", p));