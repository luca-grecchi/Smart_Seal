import { createOtpPair, validateOtp } from "./otp.js";

export const EVENTS = new Set([
  "SEALED",
  "IN_TRANSIT",
  "BOX_OPENED",
  "IMPACT_DETECTED",
  "TAMPER",
  "STATIC"
]);

export const COMMANDS = new Set([
  "COURIER_DELIVERED",
  "CLIENT_AUTHENTICATED",
  "RESET_SESSION",
  "VERDICT_COMPUTED"
]);

const PORCH_PIRACY_GAP_MS = 5000;

export function createStore() {
  return {
    sessions: new Map()
  };
}

export function createSession(store, input = {}) {
  const now = input.timestamp ? Number(input.timestamp) : Date.now();
  const sessionId = `sess_${Math.random().toString(36).slice(2, 10)}`;
  const otps = createOtpPair();

  const session = {
    id: sessionId,
    device_id: input.device_id || "SIM-001",
    state: "SEALED",
    expected_client_gps: "client_home",
    courier_gps: null,
    client_gps: null,
    courier_authenticated: false,
    client_authenticated: false,
    deliveredAt: null,
    openedAt: null,
    dispute: null,
    verdict: null,
    packageDamaged: false,
    otps,
    commands: [],
    events: [],
    createdAt: now,
    updatedAt: now
  };

  pushEvent(session, {
    source: "backend",
    event: "SEALED",
    timestamp: now,
    sensor_data: {}
  });

  store.sessions.set(sessionId, session);
  return session;
}

export function getSession(store, sessionId) {
  return store.sessions.get(sessionId) || null;
}

export function resetSession(store, sessionId) {
  const current = getSession(store, sessionId);
  if (!current) return null;
  const next = createSession(store, { device_id: current.device_id });
  store.sessions.delete(sessionId);
  return next;
}

export function deleteSession(store, sessionId) {
  return store.sessions.delete(sessionId);
}

export function scanCourier(session, input = {}) {
  const result = validateOtp(session.otps.courier, input.courier_otp);
  if (!result.ok) return result;

  session.courier_authenticated = true;
  session.courier_gps = input.gps || "unknown";
  session.deliveredAt = Date.now();
  session.state = "DELIVERED_AWAITING_RECIPIENT";
  queueCommand(session, {
    type: "COURIER_DELIVERED",
    gps: session.courier_gps
  });
  touch(session);
  computeVerdict(session);
  return { ok: true };
}

export function authenticateClient(session, input = {}) {
  const result = validateOtp(session.otps.client, input.client_otp);
  if (!result.ok) return result;

  session.client_authenticated = true;
  session.client_gps = input.gps || "unknown";
  session.state = "DELIVERED_CONFIRMED";
  queueCommand(session, {
    type: "CLIENT_AUTHENTICATED",
    gps: session.client_gps
  });
  touch(session);
  computeVerdict(session);
  return { ok: true };
}

export function disputeClient(session, input = {}) {
  session.dispute = {
    type: input.type || "EMPTY_BOX",
    timestamp: Date.now()
  };
  touch(session);
  computeVerdict(session);
  return { ok: true };
}

export function ingestEvent(session, input = {}) {
  if (!EVENTS.has(input.event)) {
    return { ok: false, reason: "UNKNOWN_EVENT" };
  }

  if (input.event === "IMPACT_DETECTED" && !isValidImpact(input)) {
    return { ok: false, reason: "INVALID_IMPACT" };
  }

  const now = Date.now();
  const logTimestamp = input.timestamp ? Number(input.timestamp) : now;
  const event = {
    source: input.source || "simulator",
    event: input.event,
    timestamp: logTimestamp,
    sensor_data: input.sensor_data || {}
  };

  if (input.event === "IMPACT_DETECTED") {
    event.severity = input.severity;
    event.confidence = Number(input.confidence);
    if (input.severity === "heavy" && session.state === "IN_TRANSIT") {
      session.packageDamaged = true;
    }
  }

  pushEvent(session, event);

  if (input.event === "IN_TRANSIT" && !session.deliveredAt) {
    session.state = "IN_TRANSIT";
  }

  if (input.event === "BOX_OPENED") {
    session.openedAt = session.openedAt || now;
    session.state = session.client_authenticated ? "OPENED_BY_CUSTOMER" : "OPENED_WITHOUT_AUTH";
  }

  if (input.event === "TAMPER") {
    session.state = "TAMPER_DETECTED";
  }

  touch(session, now);
  computeVerdict(session);
  return { ok: true };
}

function isValidImpact(input) {
  return ["light", "heavy"].includes(input.severity) && Number.isFinite(Number(input.confidence));
}

export function drainCommands(session) {
  const commands = [...session.commands];
  session.commands = [];
  return commands;
}

export function publicSession(session, includeOtps = true) {
  return {
    session_id: session.id,
    device_id: session.device_id,
    state: session.state,
    expected_client_gps: session.expected_client_gps,
    courier_gps: session.courier_gps,
    client_gps: session.client_gps,
    courier_authenticated: session.courier_authenticated,
    client_authenticated: session.client_authenticated,
    dispute: session.dispute,
    verdict: session.verdict,
    packageDamaged: session.packageDamaged,
    events: session.events,
    commands: session.commands,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    courier_otp: includeOtps ? session.otps.courier.code : undefined,
    client_otp: includeOtps ? session.otps.client.code : undefined
  };
}

function computeVerdict(session) {
  const previousVerdict = session.verdict?.code;

  if (session.client_authenticated && session.openedAt) {
    setVerdict(session, "VERDICT_A", "CLEAN_DELIVERY");
  } else if (session.openedAt && !session.client_authenticated) {
    const gap = session.deliveredAt ? session.openedAt - session.deliveredAt : 0;

    if (gap < PORCH_PIRACY_GAP_MS) {
      setVerdict(session, "VERDICT_B", "COURIER_THEFT_SUSPECTED");
    } else {
      setVerdict(session, "VERDICT_C", "PORCH_PIRACY_SUSPECTED");
    }
  } else if (session.packageDamaged) {
    setVerdict(session, "VERDICT_E", "PACKAGE_DAMAGED");
  }

  if (session.verdict && session.verdict.code !== previousVerdict) {
    queueCommand(session, {
      type: "VERDICT_COMPUTED",
      verdict: session.verdict.code
    });
  }

  return session.verdict;
}

function setVerdict(session, code, label) {
  session.verdict = {
    code,
    label,
    timestamp: Date.now()
  };
  session.state = code;
}

function queueCommand(session, command) {
  session.commands.push({
    ...command,
    timestamp: Date.now()
  });
}

function pushEvent(session, event) {
  session.events.push(event);
}

function touch(session, timestamp = Date.now()) {
  session.updatedAt = timestamp;
}
