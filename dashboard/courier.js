document.getElementById("courier-scan").addEventListener("click", async () => {
  const session = window.smartSeal.session;
  if (!session) return;

  const updated = await window.smartSeal.request("/api/courier/scan", {
    method: "POST",
    body: {
      session_id: session.session_id,
      courier_otp: document.getElementById("courier-otp-input").value.trim(),
      gps: document.getElementById("courier-gps").value
    }
  });
  window.smartSeal.setSession(updated);
});

