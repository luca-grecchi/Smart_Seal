/* Brand header: wordmark + scenario badge + session actions */

function BrandHeader({ scenario, session, onCreate, onReset }) {
  const Icon = window.StepIcon;

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
          <button className="btn" onClick={onCreate}>
            <Icon name="plus" size={14} />
            New session
          </button>
          <span style={{ width: 1, height: 24, background: 'var(--border-1)' }}></span>
          <button className="btn btn-ghost" onClick={onReset} disabled={!session}>
            <Icon name="reset" size={14} />
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}

window.BrandHeader = BrandHeader;
