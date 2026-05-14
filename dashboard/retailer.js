const socket = io();

const state = { session: null };

window.smartSeal = {
  get session() { return state.session; },
  setSession,
  request
};

// ── Connection status ──────────────────────────────────────
socket.on("connect",    () => setConn(true));
socket.on("disconnect", () => setConn(false));

function setConn(connected) {
  const el = document.getElementById("conn-indicator");
  el.textContent = connected ? "● Connected" : "● Disconnected";
  el.className   = connected ? "conn-connected" : "conn-disconnected";
}

// ── Tab switching ──────────────────────────────────────────
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t)   => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ── Session actions ────────────────────────────────────────
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

document.querySelectorAll("[data-scenario]").forEach((btn) => {
  btn.addEventListener("click", () => runScenario(btn.dataset.scenario));
});

// ── Log clear buttons ──────────────────────────────────────
document.getElementById("clear-serial").addEventListener("click", () => {
  document.getElementById("serial-log").innerHTML = "";
});
document.getElementById("clear-event").addEventListener("click", () => {
  document.getElementById("event-log").innerHTML = "";
});

// ── Socket events ──────────────────────────────────────────
socket.on("session.update", (payload) => {
  if (payload?.session_id) setSession(payload);
  appendLog("event-log", "session.update", payload, "source-backend");
});
socket.on("device.event",    (p) => appendLog("event-log", "device.event",    p, "source-arduino"));
socket.on("command.created", (p) => appendLog("event-log", "command.created", p, "source-backend"));
socket.on("verdict.computed",(p) => appendLog("event-log", "verdict.computed",p, "source-backend"));
socket.on("error.event",     (p) => appendLog("event-log", "error.event",     p, "source-error"));

socket.on("serial.log", ({ message, source, timestamp }) => {
  const sourceClass = source === "arduino" ? "source-arduino" : "source-bridge";
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML =
    `<span class="log-time">${new Date(timestamp).toLocaleTimeString()}</span>` +
    `<span class="${sourceClass}">[${escapeHtml(source)}]</span>` +
    `<span class="log-msg">${escapeHtml(message)}</span>`;
  const target = document.getElementById("serial-log");
  target.insertBefore(entry, target.firstChild);
});

// ── Scenarios ──────────────────────────────────────────────
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
      sensor_data: { light: 850, accel_norm: 12.3, product_present: true, ...sensorData }
    }
  });
}

async function loadSession(sessionId) {
  if (!sessionId) return;
  const session = await request(`/api/session/${sessionId}`);
  setSession(session);
}

// ── Session rendering ──────────────────────────────────────
function setSession(session) {
  state.session = session;

  document.getElementById("state").textContent = session.state || "-";

  const verdictEl   = document.getElementById("verdict");
  const verdictCode = session.verdict?.code ?? null;
  verdictEl.textContent = verdictCode || "-";
  verdictEl.className   = verdictCode === "VERDICT_A" ? "verdict-clean"
                        : verdictCode               ? "verdict-fraud"
                        : "";

  document.getElementById("courier-otp").textContent     = session.courier_otp || "-";
  document.getElementById("client-otp").textContent      = session.client_otp  || "-";
  document.getElementById("courier-otp-input").value     = session.courier_otp || "";
  document.getElementById("client-otp-input").value      = session.client_otp  || "";

  renderSessionCard(session);
}

function renderSessionCard(session) {
  const card = document.getElementById("session-card");
  if (!session?.session_id) {
    card.innerHTML = '<p class="text-zinc-500 text-sm">No session loaded.</p>';
    return;
  }

  const eventsHtml = session.events.length
    ? session.events.map((e) => `
        <div class="card-row">
          <span class="event-dot"></span>
          <span class="font-medium text-zinc-200">${escapeHtml(e.event)}</span>
          <span class="tag source-${escapeAttr(e.source)}">${escapeHtml(e.source)}</span>
          <span class="log-time ml-auto">${new Date(e.timestamp).toLocaleTimeString()}</span>
        </div>`).join("")
    : '<p class="text-zinc-600 text-xs py-1">No events yet.</p>';

  const commandsHtml = session.commands.length
    ? session.commands.map((c) => `
        <div class="card-row">
          <span class="text-zinc-500">→</span>
          <span class="font-medium text-zinc-200">${escapeHtml(c.type)}</span>
          ${c.verdict ? `<span class="tag source-backend">${escapeHtml(c.verdict)}</span>` : ""}
          ${c.gps     ? `<span class="tag">${escapeHtml(c.gps)}</span>` : ""}
        </div>`).join("")
    : '<p class="text-zinc-600 text-xs py-1">No commands yet.</p>';

  card.innerHTML = `
    <div class="card-meta">
      <div class="card-field">
        <span class="card-label">Session</span>
        <span class="card-value">${escapeHtml(session.session_id)}</span>
      </div>
      <div class="card-field">
        <span class="card-label">Device</span>
        <span class="card-value">${escapeHtml(session.device_id || "-")}</span>
      </div>
      <div class="card-field">
        <span class="card-label">Created</span>
        <span class="card-value" style="font-family:inherit">${new Date(session.createdAt).toLocaleString()}</span>
      </div>
    </div>
    <div class="card-section">
      <h3 class="card-section-title">Events</h3>
      ${eventsHtml}
    </div>
    <div class="card-section">
      <h3 class="card-section-title">Commands</h3>
      ${commandsHtml}
    </div>`;
}

// ── Utilities ──────────────────────────────────────────────
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    appendLog("event-log", "http error", data, "source-error");
    throw new Error(data.error || response.statusText);
  }
  return data;
}

function appendLog(targetId, label, payload, sourceClass = "source-unknown") {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML =
    `<span class="log-time">${new Date().toLocaleTimeString()}</span>` +
    `<span class="${sourceClass}">${escapeHtml(label)}</span>` +
    `<span class="log-msg">${escapeHtml(JSON.stringify(payload))}</span>`;
  const target = document.getElementById(targetId);
  target.insertBefore(entry, target.firstChild);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str).replace(/[^a-z0-9-]/gi, "");
}
