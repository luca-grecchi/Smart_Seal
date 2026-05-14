document.querySelectorAll("[data-event]").forEach((button) => {
  button.addEventListener("click", async () => {
    const session = window.smartSeal.session;
    if (!session) return;

    const updated = await window.smartSeal.request("/api/event", {
      method: "POST",
      body: {
        session_id: session.session_id,
        source: "simulator",
        event: button.dataset.event,
        timestamp: Date.now(),
        sensor_data: {
          light: Number(document.getElementById("sensor-light").value),
          accel_norm: Number(document.getElementById("sensor-accel").value),
          product_present: document.getElementById("sensor-product").value === "true"
        }
      }
    });
    window.smartSeal.setSession(updated);
  });
});

