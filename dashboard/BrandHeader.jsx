/* Brand header: wordmark + live status + scenario badge + backend connect */

function BrandHeader({ session, scenario, backend, onConnect, onDisconnect }) {
  const [url, setUrl] = React.useState(backend?.url || 'http://localhost:3000');
  const connected = !!backend?.connected;
  const connecting = !!backend?.connecting;

  return (
    <header className="row" style={{ alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
      {/* Logo */}
      <div className="row gap-3" style={{ alignItems: 'center' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'linear-gradient(180deg, var(--bg-2), var(--bg-1))',
          border: '1px solid var(--border-2)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 0 0 4px color-mix(in oklab, var(--accent) 6%, transparent)'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="6" width="18" height="15" rx="2"
                  stroke="var(--fg-2)" strokeWidth="1.5"/>
            <line x1="3" y1="11" x2="21" y2="11" stroke="var(--fg-2)" strokeWidth="1.5"/>
            <circle cx="12" cy="6" r="2.5" fill="var(--accent-glow)"/>
          </svg>
        </div>
        <div className="col gap-1" style={{ gap: 2 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700,
            letterSpacing: '0.06em', whiteSpace: 'nowrap'
          }}>
            SMART <span style={{ color: 'var(--accent-glow)' }}>●</span> SEAL
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            Operator console · v0.1
          </div>
        </div>
      </div>

      {/* Backend connect */}
      <div className="right row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {scenario && (
          <div className="tag" style={{
            color: 'var(--accent-glow)',
            borderColor: 'color-mix(in oklab, var(--accent) 40%, var(--border-1))'
          }}>
            SCENARIO {scenario}
          </div>
        )}

        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <input
            className="input mono"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:3000"
            disabled={connected || connecting}
            style={{ width: 220, fontSize: 12 }}
          />
          {!connected ? (
            <button className="btn btn-primary" onClick={() => onConnect(url)} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect backend'}
            </button>
          ) : (
            <button className="btn btn-danger" onClick={onDisconnect}>
              Disconnect
            </button>
          )}
        </div>

        <span className={connected ? 'live-dot' : 'live-dot'}>
          <span className="pulse" style={{ background: connected ? 'var(--clean)' : 'var(--fg-4)' }}></span>
          {connected ? (session ? 'Live · session active' : 'Live · backend ready')
                     : connecting ? 'Connecting…'
                     : 'Offline'}
        </span>
      </div>
    </header>
  );
}

window.BrandHeader = BrandHeader;

