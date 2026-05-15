/* App — composes the redesigned demo. Drives a single local session
   through the in-browser state engine in window.SmartSeal.
   Layout:
     • BrandHeader
     • Hero card: MissionControl (animated stepper + verdict badge)
     • Row: ScenarioRunner (left, grows) + SessionMeta (right, fixed)
     • Row: ManualControls (left, grows) + LiveLog (right, fixed)
     • Tweaks panel (floating, toggled via toolbar)
*/

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#14b8a6",
  "motion": 1.0,
  "meshOpacity": 0.55,
  "showMesh": true,
  "showTexture": true,
  "density": "spacious"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ['#14b8a6', '#a3e635', '#60a5fa', '#c084fc', '#fb923c', '#f472b6'];

function App() {
  // Pull JSX-referenced components into local scope so JSX evaluates
  // identifiers (not member-expressions on the global object) — avoids a
  // react-dom dev-mode crash when any one of them is missing.
  const {
    BrandHeader, MissionControl, ScenarioRunner, SessionMeta,
    ManualControls, LiveLog,
    TweaksPanel, TweakSection, TweakColor, TweakToggle, TweakSlider, TweakRadio,
    useTweaks
  } = window;

  const [session, setSession] = React.useState(null);
  const [events, setEvents] = React.useState([]);
  const [runningScenario, setRunningScenario] = React.useState(null);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Realtime backend connection state. `client` is the realtime handle
  // returned by SmartSealRealtime.connect; null in local/mock mode.
  const [backend, setBackend] = React.useState({ connected: false, connecting: false, url: 'http://localhost:3000' });
  const clientRef = React.useRef(null);

  React.useEffect(() => { handleConnect(backend.url); }, []);

  async function handleConnect(url) {
    setBackend({ connected: false, connecting: true, url });
    try {
      const client = await window.SmartSealRealtime.connect(url, {
        onConnect: () => setBackend((b) => ({ ...b, connected: true, connecting: false })),
        onDisconnect: () => setBackend((b) => ({ ...b, connected: false })),
        onError: (msg) => { appendEvent('CONNECT_ERROR', 'error'); setBackend((b) => ({ ...b, connecting: false })); },
        onSession: (s) => commitSession(s),
        onCleared: () => { setSession(null); setEvents([]); },
        onDeviceEvent: (e) => appendEvent(e.event || 'device.event', e.source || 'arduino', {
          timestamp: e.timestamp,
          severity: e.severity,
          confidence: e.confidence,
          sensor_data: e.sensor_data
        }),
        onCommand: (c) => appendEvent(c.type || 'command', 'backend'),
        onVerdict: (v) => appendEvent('VERDICT_COMPUTED', 'backend', { verdict: v?.label || v?.code }),
        onSerial: () => {},
        onErrorEvt: (e) => appendEvent('ERROR', 'error')
      });
      clientRef.current = client;
    } catch (e) {
      appendEvent('CONNECT_FAILED', 'error');
      setBackend({ connected: false, connecting: false, url });
    }
  }

  function handleDisconnect() {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setBackend((b) => ({ ...b, connected: false, connecting: false }));
  }

  // Apply tweaks → CSS custom props on :root
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--accent-soft', t.accent + '55');
    root.style.setProperty('--accent-glow', lighten(t.accent, 0.12));
    root.style.setProperty('--motion', String(t.motion));
    document.documentElement.dataset.density = t.density;
    const card = document.documentElement.style;
    if (t.density === 'compact') { card.setProperty('--pad-card', '20px'); card.setProperty('--gap-grid', '16px'); }
    else { card.setProperty('--pad-card', '28px'); card.setProperty('--gap-grid', '24px'); }
    document.querySelector('.mesh').style.opacity = t.showMesh ? t.meshOpacity : 0;
    document.querySelector('.page').classList.toggle('no-texture', !t.showTexture);
  }, [t.accent, t.motion, t.density, t.meshOpacity, t.showMesh, t.showTexture]);

  function sealedEntry() {
    return { id: 'sealed-' + Date.now(), event: 'SEALED', source: 'arduino', timestamp: Date.now(), flavor: 'ok' };
  }

  // Add an event to the visible log with a derived flavor class
  function toLogEntry(event, source, extra = {}) {
    const timestamp = Number(extra.timestamp) || Date.now();
    const sensor_data = extra.sensor_data;
    const sensorKey = sensor_data ? JSON.stringify(sensor_data) : '';
    return {
      id: extra.id || `${event}-${source}-${timestamp}-${sensorKey}`,
      event, source,
      timestamp,
      flavor: flavorFor(event, extra.severity),
      ...extra
    };
  }

  function appendEvent(event, source, extra = {}) {
    const entry = toLogEntry(event, source, extra);
    setEvents((prev) => {
      if (prev.some((e) => e.event === 'VERDICT_COMPUTED')) return prev;
      if (prev.some((e) => eventKey(e) === eventKey(entry))) return prev;
      return [{
        ...entry,
        id: 'e' + Date.now() + Math.random().toString(36).slice(2, 5)
      }, ...prev].slice(0, 80);
    });
  }

  function mergeSessionEvents(sessionEvents = []) {
    if (!Array.isArray(sessionEvents) || sessionEvents.length === 0) return;

    setEvents((prev) => {
      const existingKeys = new Set(prev.map(eventKey));
      const incoming = sessionEvents
        .map((e) => toLogEntry(e.event, e.source || 'backend', {
          timestamp: e.timestamp,
          severity: e.severity,
          confidence: e.confidence,
          sensor_data: e.sensor_data,
          verdict: e.verdict
        }))
        .filter((entry) => {
          const key = eventKey(entry);
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });

      if (incoming.length === 0) return prev;
      return [...incoming, ...prev]
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
        .slice(0, 80);
    });
  }

  function eventKey(e) {
    return [
      e.event,
      e.source,
      e.timestamp,
      e.severity || '',
      e.confidence ?? '',
      e.sensor_data ? JSON.stringify(e.sensor_data) : ''
    ].join('|');
  }

  function commitSession(s) {
    setSession({ ...s });
    mergeSessionEvents(s?.events);
  }

  function maybeAppendVerdict(s, prevCode) {
    if (s.verdict?.code && s.verdict.code !== prevCode) {
      appendEvent('VERDICT_COMPUTED', 'simulator', { verdict: s.verdict.label || s.verdict.code });
    }
  }

  function handleCreate() {
    console.debug('[SmartSeal] New session clicked', { connected: backend.connected });
    setRunningScenario(null);
    if (backend.connected && clientRef.current) {
      clientRef.current.createSeal().then((s) => commitSession(s)).catch(() => appendEvent('CREATE_FAILED', 'error'));
      return;
    }
    const s = window.SmartSeal.createSession('SIM-001');
    setEvents([sealedEntry()]);
    commitSession(s);
  }

  function handleReset() {
    setRunningScenario(null);
    if (backend.connected && clientRef.current && session) {
      clientRef.current.clearSession(session.session_id).catch(() => {});
    }
    setSession(null);
    setEvents([]);
  }

  async function handleRun(name) {
    setRunningScenario(name);
    setEvents([]);
    setSession(null);
    let prevCode = null;
    try {
      await window.SmartSeal.runScenario(name, {
        onUpdate: (s) => {
          maybeAppendVerdict(s, prevCode);
          prevCode = s.verdict?.code ?? prevCode;
          commitSession(s);
        },
        onEvent: (e) => appendEvent(e.event, e.source, { severity: e.severity, confidence: e.confidence })
      });
    } finally {
      setRunningScenario(null);
    }
  }

  function handleCourierScan(otp, gps) {
    if (!session) return;
    if (backend.connected && clientRef.current) {
      clientRef.current.scanCourier(session.session_id, otp, gps).catch(() => appendEvent('SCAN_FAILED', 'error'));
      return;
    }
    const prevCode = session.verdict?.code;
    const r = window.SmartSeal.scanCourier(session, { courier_otp: otp, gps });
    if (!r.ok) appendEvent('OTP_MISMATCH', 'error');
    maybeAppendVerdict(session, prevCode);
    commitSession(session);
  }
  function handleClientAuth(otp, gps) {
    if (!session) return;
    if (backend.connected && clientRef.current) {
      clientRef.current.authClient(session.session_id, otp, gps).catch(() => appendEvent('AUTH_FAILED', 'error'));
      return;
    }
    const prevCode = session.verdict?.code;
    const r = window.SmartSeal.authenticateClient(session, { client_otp: otp, gps });
    if (!r.ok) appendEvent('OTP_MISMATCH', 'error');
    maybeAppendVerdict(session, prevCode);
    commitSession(session);
  }
  function handleClientDispute() {
    if (!session) return;
    if (backend.connected && clientRef.current) {
      clientRef.current.dispute(session.session_id).catch(() => appendEvent('DISPUTE_FAILED', 'error'));
      return;
    }
    const prevCode = session.verdict?.code;
    window.SmartSeal.disputeClient(session, { type: 'EMPTY_BOX' });
    appendEvent('DISPUTE_EMPTY_BOX', 'backend');
    maybeAppendVerdict(session, prevCode);
    commitSession(session);
  }
  function handleDeviceEvent(event, opts = {}) {
    if (!session) return;
    const { sensor_data = {}, severity, confidence } = opts;
    if (backend.connected && clientRef.current) {
      clientRef.current.sendEvent(session.session_id, event, opts).catch(() => appendEvent('EVENT_FAILED', 'error'));
      return;
    }
    const prevCode = session.verdict?.code;
    window.SmartSeal.ingestEvent(session, { source: 'simulator', event, sensor_data, severity, confidence });
    appendEvent(event, 'simulator', { severity, confidence });
    maybeAppendVerdict(session, prevCode);
    commitSession(session);
  }

  return (
    <div className="page">
      <BrandHeader
        scenario={runningScenario}
        session={session}
        onCreate={handleCreate}
        onReset={handleReset}
      />

      {/* HERO: mission-control stepper */}
      <MissionControl session={session} />

      {/* PRIMARY: Session + Live event log (focus for real-data demo) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 'var(--gap-grid)', marginTop: 24 }}>
        <SessionMeta
          session={session}
          onCourierScan={handleCourierScan}
          onClientAuth={handleClientAuth}
          onClientDispute={handleClientDispute}
        />
        <LiveLog events={events} />
      </div>

      {/* SECONDARY: Scripted scenarios + manual driver */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--gap-grid)', marginTop: 24 }}>
        <ScenarioRunner
          runningScenario={runningScenario}
          onRun={handleRun}
        />
        <ManualControls
          session={session}
          onCourierScan={handleCourierScan}
          onClientAuth={handleClientAuth}
          onClientDispute={handleClientDispute}
          onDeviceEvent={handleDeviceEvent}
        />
      </div>

      {/* Tweaks panel — appears when toolbar toggle is on */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Brand">
          <TweakColor
            label="Accent"
            value={t.accent}
            options={ACCENT_OPTIONS}
            onChange={(v) => setTweak('accent', v)}
          />
        </TweakSection>

        <TweakSection label="Background">
          <TweakToggle label="Mesh gradient"  value={t.showMesh}    onChange={(v) => setTweak('showMesh', v)} />
          <TweakSlider label="Mesh intensity" value={Math.round(t.meshOpacity * 100)} min={0} max={100} unit="%"
                              onChange={(v) => setTweak('meshOpacity', v / 100)} />
          <TweakToggle label="Dot texture"    value={t.showTexture} onChange={(v) => setTweak('showTexture', v)} />
        </TweakSection>

        <TweakSection label="Motion">
          <TweakSlider label="Speed" value={Math.round(t.motion * 100)} min={0} max={200} unit="%"
                              onChange={(v) => setTweak('motion', v / 100)} />
        </TweakSection>

        <TweakSection label="Layout">
          <TweakRadio
            label="Density"
            value={t.density}
            options={[{ value: 'spacious', label: 'Spacious' }, { value: 'compact', label: 'Compact' }]}
            onChange={(v) => setTweak('density', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// utility: classify event for log row styling
function flavorFor(event, severity) {
  if (event === 'BOX_OPENED') return 'warn';
  if (event === 'PRODUCT_REMOVED' || event === 'TAMPER' || event === 'OTP_MISMATCH') return 'danger';
  if (event === 'IMPACT_DETECTED') return severity === 'heavy' ? 'danger' : 'impact';
  if (event === 'VERDICT_COMPUTED' || event === 'SEALED') return 'ok';
  return '';
}

// Lighten a hex color by mixing toward white (0..1)
function lighten(hex, amt) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const lr = Math.round(r + (255 - r) * amt);
  const lg = Math.round(g + (255 - g) * amt);
  const lb = Math.round(b + (255 - b) * amt);
  return '#' + [lr, lg, lb].map(v => v.toString(16).padStart(2, '0')).join('');
}

window.App = App;
