/* Realtime client — connects to a running Smart Seal backend over Socket.IO.
   Mirrors the contract from backend/server.js: emits via /api/* and listens
   for `session.update`, `device.event`, `command.created`, `verdict.computed`,
   `serial.log`, `error.event`. Falls back to local state if not connected. */

(function () {
  const SOCKET_CDN = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
  let socketLib = null;
  let loading = null;

  function loadSocketIO() {
    if (window.io) { socketLib = window.io; return Promise.resolve(window.io); }
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SOCKET_CDN;
      s.onload = () => { socketLib = window.io; resolve(window.io); };
      s.onerror = (e) => reject(new Error('Failed to load socket.io-client'));
      document.head.appendChild(s);
    });
    return loading;
  }

  async function jsonRequest(baseUrl, path, options = {}) {
    const resp = await fetch(baseUrl + path, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
      mode: 'cors'
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.error || resp.statusText);
    return data;
  }

  async function connect(baseUrl, handlers = {}) {
    const url = baseUrl.replace(/\/+$/, '');
    await loadSocketIO();
    const socket = socketLib(url, { transports: ['websocket', 'polling'], reconnection: true });
    socket.on('connect',    () => handlers.onConnect?.());
    socket.on('disconnect', () => handlers.onDisconnect?.());
    socket.on('connect_error', (err) => handlers.onError?.(err?.message || String(err)));
    socket.on('session.update',   (p) => handlers.onSession?.(p));
    socket.on('device.event',     (p) => handlers.onDeviceEvent?.(p));
    socket.on('command.created',  (p) => handlers.onCommand?.(p));
    socket.on('verdict.computed', (p) => handlers.onVerdict?.(p));
    socket.on('serial.log',       (p) => handlers.onSerial?.(p));
    socket.on('error.event',      (p) => handlers.onErrorEvt?.(p));

    return {
      // REST helpers that match the backend's API contract
      createSeal: () => jsonRequest(url, '/api/seal', { method: 'POST', body: { device_id: 'OPERATOR', timestamp: Date.now() } }),
      getSession: (id) => jsonRequest(url, `/api/session/${id}`),
      resetSession: (id) => jsonRequest(url, `/api/session/${id}/reset`, { method: 'POST' }),
      scanCourier: (id, otp, gps) => jsonRequest(url, '/api/courier/scan', { method: 'POST', body: { session_id: id, courier_otp: otp, gps } }),
      authClient: (id, otp, gps) => jsonRequest(url, '/api/client/authenticate', { method: 'POST', body: { session_id: id, client_otp: otp, gps } }),
      dispute: (id) => jsonRequest(url, '/api/client/dispute', { method: 'POST', body: { session_id: id, type: 'EMPTY_BOX' } }),
      sendEvent: (id, event, sensor_data) => jsonRequest(url, '/api/event', { method: 'POST', body: { session_id: id, source: 'simulator', event, timestamp: Date.now(), sensor_data } }),
      disconnect: () => socket.disconnect()
    };
  }

  window.SmartSealRealtime = { connect };
})();
