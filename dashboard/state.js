/* Local port of backend/state_engine.js — runs entirely in the browser.
   Same event names, same verdict rules, same logic-lock semantics.
   Loaded as a plain <script> so it can attach helpers to window. */

(function () {
  const PORCH_PIRACY_GAP_MS = 5000;

  function rid(n = 8) {
    return Math.random().toString(36).slice(2, 2 + n);
  }
  function otp() {
    return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  }
  function nowTs() { return Date.now(); }

  function createSession(deviceId = "SIM-001") {
    const now = nowTs();
    const session = {
      session_id: `sess_${rid(8)}`,
      device_id: deviceId,
      state: "SEALED",
      expected_client_gps: "client_home",
      courier_gps: null,
      client_gps: null,
      courier_authenticated: false,
      client_authenticated: false,
      deliveredAt: null,
      openedAt: null,
      productRemovedAt: null,
      productRemovedLock: false,
      dispute: null,
      verdict: null,
      packageDamaged: false,
      courier_otp: otp(),
      client_otp: otp(),
      commands: [],
      events: [
        { source: "backend", event: "SEALED", timestamp: now, sensor_data: {} }
      ],
      createdAt: now,
      updatedAt: now
    };
    return session;
  }

  function pushEvent(session, event) { session.events.push(event); }
  function queueCommand(session, command) {
    session.commands.push({ ...command, timestamp: nowTs() });
  }
  function setVerdict(session, code, label) {
    session.verdict = { code, label, timestamp: nowTs() };
    session.state = code;
  }

  function computeVerdict(session) {
    const previous = session.verdict?.code;
    if (session.client_authenticated && session.openedAt) {
      setVerdict(session, "VERDICT_A", "CLEAN_DELIVERY");
    } else if (session.openedAt && !session.client_authenticated) {
      const gap = session.deliveredAt ? session.openedAt - session.deliveredAt : 0;
      if (gap < PORCH_PIRACY_GAP_MS) setVerdict(session, "VERDICT_B", "COURIER_THEFT_SUSPECTED");
      else setVerdict(session, "VERDICT_C", "PORCH_PIRACY_SUSPECTED");
    } else if (session.packageDamaged) {
      setVerdict(session, "VERDICT_E", "PACKAGE_DAMAGED");
    }
    if (session.verdict && session.verdict.code !== previous) {
      queueCommand(session, { type: "VERDICT_COMPUTED", verdict: session.verdict.code });
    }
  }

  function scanCourier(session, { courier_otp, gps }) {
    if (courier_otp !== session.courier_otp) return { ok: false, reason: "OTP_MISMATCH" };
    session.courier_authenticated = true;
    session.courier_gps = gps || "unknown";
    session.deliveredAt = nowTs();
    session.state = "DELIVERED_AWAITING_RECIPIENT";
    queueCommand(session, { type: "COURIER_DELIVERED", gps: session.courier_gps });
    session.updatedAt = nowTs();
    computeVerdict(session);
    return { ok: true };
  }

  function authenticateClient(session, { client_otp, gps }) {
    if (client_otp !== session.client_otp) return { ok: false, reason: "OTP_MISMATCH" };
    session.client_authenticated = true;
    session.client_gps = gps || "unknown";
    session.state = "DELIVERED_CONFIRMED";
    queueCommand(session, { type: "CLIENT_AUTHENTICATED", gps: session.client_gps });
    session.updatedAt = nowTs();
    computeVerdict(session);
    return { ok: true };
  }

  function disputeClient(session, { type = "EMPTY_BOX" } = {}) {
    session.dispute = { type, timestamp: nowTs() };
    session.updatedAt = nowTs();
    computeVerdict(session);
    return { ok: true };
  }

  function ingestEvent(session, { source = "simulator", event, sensor_data = {}, severity, confidence } = {}) {
    const timestamp = nowTs();
    const entry = { source, event, timestamp, sensor_data };
    if (event === "IMPACT_DETECTED") {
      entry.severity = severity;
      entry.confidence = confidence;
      if (severity === "heavy" && session.state === "IN_TRANSIT") session.packageDamaged = true;
    }
    pushEvent(session, entry);

    if (event === "IN_TRANSIT" && !session.deliveredAt) session.state = "IN_TRANSIT";
    if (event === "BOX_OPENED") {
      session.openedAt = session.openedAt || timestamp;
      session.state = session.client_authenticated ? "OPENED_BY_CUSTOMER" : "OPENED_WITHOUT_AUTH";
    }
    if (event === "PRODUCT_REMOVED") {
      session.productRemovedAt = session.productRemovedAt || timestamp;
      session.productRemovedLock = true;
      session.state = session.client_authenticated ? "REMOVED_BY_CUSTOMER" : "PRODUCT_REMOVED_WITHOUT_AUTH";
    }
    if (event === "TAMPER") session.state = "TAMPER_DETECTED";

    session.updatedAt = timestamp;
    computeVerdict(session);
    return { ok: true };
  }

  function resetSession(prev) {
    return createSession(prev?.device_id || "SIM-001");
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function emit(s, onUpdate, onEvent) {
    onUpdate?.(s);
    const last = s.events.at(-1);
    if (last) onEvent?.(last);
  }

  async function runScenario(name, { onUpdate, onEvent } = {}) {
    const s = createSession(`SIM-${name}`);
    emit(s, onUpdate, onEvent);

    if (name === "A" || name === "D") {
      scanCourier(s, { courier_otp: s.courier_otp, gps: "client_home" }); onUpdate?.(s);
      authenticateClient(s, { client_otp: s.client_otp, gps: "client_home" }); onUpdate?.(s);
      ingestEvent(s, { source: "simulator", event: "BOX_OPENED" }); emit(s, onUpdate, onEvent);
      ingestEvent(s, { source: "simulator", event: "PRODUCT_REMOVED", sensor_data: { product_present: false } }); emit(s, onUpdate, onEvent);
      if (name === "D") { disputeClient(s, { type: "EMPTY_BOX" }); onUpdate?.(s); }
    }
    if (name === "B") {
      scanCourier(s, { courier_otp: s.courier_otp, gps: "client_home" }); onUpdate?.(s);
      ingestEvent(s, { source: "simulator", event: "BOX_OPENED" }); emit(s, onUpdate, onEvent);
    }
    if (name === "C") {
      scanCourier(s, { courier_otp: s.courier_otp, gps: "client_home" }); onUpdate?.(s);
      await sleep(5200);
      ingestEvent(s, { source: "simulator", event: "BOX_OPENED" }); emit(s, onUpdate, onEvent);
    }
    return s;
  }

  function eventDotClass(event) {
    if (event === "IMPACT_DETECTED") return "dot-impact";
    if (event === "BOX_OPENED") return "dot-warning";
    if (event === "PRODUCT_REMOVED") return "dot-danger";
    if (event === "TAMPER") return "dot-danger";
    return "";
  }
  function eventTextClass(event) {
    if (event === "IMPACT_DETECTED") return "text-amber-400";
    if (event === "BOX_OPENED") return "text-yellow-400";
    if (event === "PRODUCT_REMOVED") return "text-red-400";
    if (event === "TAMPER") return "text-red-400";
    return "text-zinc-200";
  }

  Object.assign(window, {
    SmartSeal: {
      createSession, resetSession,
      scanCourier, authenticateClient, disputeClient, ingestEvent,
      runScenario, eventDotClass, eventTextClass
    }
  });
})();
