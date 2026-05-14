document.getElementById("client-auth").addEventListener("click", async () => {
  const session = window.smartSeal.session;
  if (!session) return;

  const updated = await window.smartSeal.request("/api/client/authenticate", {
    method: "POST",
    body: {
      session_id: session.session_id,
      client_otp: document.getElementById("client-otp-input").value.trim(),
      gps: document.getElementById("client-gps").value
    }
  });
  window.smartSeal.setSession(updated);
});

document.getElementById("client-dispute").addEventListener("click", async () => {
  const session = window.smartSeal.session;
  if (!session) return;

  const updated = await window.smartSeal.request("/api/client/dispute", {
    method: "POST",
    body: {
      session_id: session.session_id,
      type: "EMPTY_BOX"
    }
  });
  window.smartSeal.setSession(updated);
});

