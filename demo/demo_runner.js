const API = process.env.SMART_SEAL_API || "http://localhost:3000";

const scenario = process.argv[2] || "A";

async function main() {
  const created = await request("/api/seal", {
    method: "POST",
    body: { device_id: `DEMO-${scenario}`, timestamp: Date.now() }
  });

  if (scenario === "A") {
    await courier(created, "client_home");
    await client(created);
    await event(created, "BOX_OPENED");
  } else if (scenario === "B") {
    await courier(created, "courier_depot");
    await event(created, "BOX_OPENED");
  } else if (scenario === "C") {
    await courier(created, "client_home");
    await sleep(5200);
    await event(created, "BOX_OPENED");
  } else if (scenario === "D") {
    throw new Error("Scenario D removed: no product sensor available");
  } else {
    throw new Error(`Unknown scenario: ${scenario}`);
  }

  const finalSession = await request(`/api/session/${created.session_id}`);
  console.log(JSON.stringify(finalSession, null, 2));
}

function courier(session, gps) {
  return request("/api/courier/scan", {
    method: "POST",
    body: {
      session_id: session.session_id,
      courier_otp: session.courier_otp,
      gps
    }
  });
}

function client(session) {
  return request("/api/client/authenticate", {
    method: "POST",
    body: {
      session_id: session.session_id,
      client_otp: session.client_otp,
      gps: "client_home"
    }
  });
}

function event(session, name, sensorData = {}) {
  return request("/api/event", {
    method: "POST",
    body: {
      session_id: session.session_id,
      source: "simulator",
      event: name,
      timestamp: Date.now(),
      sensor_data: {
        light: 850,
        accel_norm: 12.3,
        ...sensorData
      }
    }
  });
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${path}: ${JSON.stringify(data)}`);
  }
  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

