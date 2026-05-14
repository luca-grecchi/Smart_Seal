const socket = io();

const state = {
  session: null
};

window.smartSeal = {
  get session() {
    return state.session;
  },
  setSession,
  request
};

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.tab).classList.add("active");
  });
});

document.getElementById("create-session").addEventListener("click", async () => {
  const session = await request("/api/seal", {
    method: "POST",
    body: { device_id: "SIM-001", timestamp: Date.now() }
  });
  document.getElementById("session-id").value = session.session_id;
  await loadSession(session.session_id);
});

document.getElementById("load-session").addEventListener("click", async () => {
  await loadSession(document.getElementById("session-id").value.trim());
});

document.getElementById("reset-session").addEventListener("click", async () => {
  if (!state.session) return;
  const session = await request(`/api/session/${state.session.session_id}/reset`, { method: "POST" });
  document.getElementById("session-id").value = session.session_id;
  setSession(session);
});

document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => runScenario(button.dataset.scenario));
});

socket.on("session.update", (payload) => {
  if (payload?.session_id) setSession(payload);
  log("socket session.update", payload);
});
socket.on("device.event", (payload) => log("socket device.event", payload));
socket.on("command.created", (payload) => log("socket command.created", payload));
socket.on("verdict.computed", (payload) => log("socket verdict.computed", payload));
socket.on("error.event", (payload) => log("socket error.event", payload));

async function runScenario(name) {
  const session = await request("/api/seal", {
    method: "POST",
    body: { device_id: `SIM-${name}`, timestamp: Date.now() }
  });
  document.getElementById("session-id").value = session.session_id;
  await loadSession(session.session_id);

  if (name === "A" || name === "D") {
    await request("/api/courier/scan", {
      method: "POST",
      body: { session_id: session.session_id, courier_otp: session.courier_otp, gps: "client_home" }
    });
    await request("/api/client/authenticate", {
      method: "POST",
      body: { session_id: session.session_id, client_otp: session.client_otp, gps: "client_home" }
    });
    await sendEvent("BOX_OPENED");
    await sendEvent("PRODUCT_REMOVED", { product_present: false });
    if (name === "D") {
      await request("/api/client/dispute", {
        method: "POST",
        body: { session_id: session.session_id, type: "EMPTY_BOX" }
      });
    }
  }

  if (name === "B") {
    await request("/api/courier/scan", {
      method: "POST",
      body: { session_id: session.session_id, courier_otp: session.courier_otp, gps: "courier_depot" }
    });
    await sendEvent("BOX_OPENED");
  }

  if (name === "C") {
    await request("/api/courier/scan", {
      method: "POST",
      body: { session_id: session.session_id, courier_otp: session.courier_otp, gps: "client_home" }
    });
    await new Promise((resolve) => setTimeout(resolve, 5200));
    await sendEvent("BOX_OPENED");
  }

  await loadSession(session.session_id);
}

async function sendEvent(event, sensorData = {}) {
  return request("/api/event", {
    method: "POST",
    body: {
      session_id: state.session.session_id,
      source: "simulator",
      event,
      timestamp: Date.now(),
      sensor_data: {
        light: 850,
        accel_norm: 12.3,
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

