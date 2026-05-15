/* Live event log — entries slide in from the top, fresh ones get a dot pulse */

function LiveLog({ events }) {
  const humanize = (s) => String(s ?? '').toLowerCase().split(/[_\s]+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return (
    <div className="card">
      <div className="row mb-4" style={{ alignItems: 'center' }}>
        <div className="eyebrow">Live event log</div>
        <span className="right t-muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {events.length} entries
        </span>
      </div>
      <div className="log">
        <div className="log-inner">
          {events.length === 0 ? (
            <div style={{ color: 'var(--fg-4)', fontSize: 12, padding: 16, fontFamily: 'var(--font-mono)' }}>
              waiting on first event…
            </div>
          ) : (
            events.map((e, i) => (
              <div
                key={e.id}
                className={`evt-row ${e.flavor || ''} ${i === 0 ? 'fresh' : ''}`}
              >
                <span className="t">{new Date(e.timestamp).toLocaleTimeString()}</span>
                <span className="d"></span>
                <span className="n">
                  {e.event === 'IMPACT_DETECTED' && e.severity
                    ? (e.severity === 'heavy' ? 'Heavy Impact' : 'Light Impact')
                    : humanize(e.event)}
                </span>
                <span className={`src ${e.source}`}>{e.source}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

window.LiveLog = LiveLog;
