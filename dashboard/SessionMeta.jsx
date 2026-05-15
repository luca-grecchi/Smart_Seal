/* Session meta — session id + OTPs (big monospace), GPS expected */

function SessionMeta({ session }) {
  return (
    <div className="card">
      <div className="eyebrow mb-4">Session</div>

      {!session ? (
        <div style={{ color: 'var(--fg-3)', fontSize: 13 }}>
          No session yet. Create one above to mint OTPs.
        </div>
      ) : (
        <>
          <div className="row mb-4" style={{ alignItems: 'baseline' }}>
            <div className="col gap-1" style={{ gap: 2 }}>
              <div style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
                Session ID
              </div>
              <div className="t-mono" style={{ fontSize: 14, color: 'var(--fg-1)' }}>
                {session.session_id}
              </div>
            </div>
            <div className="right tag" style={{ color: 'var(--fg-2)' }}>
              {session.device_id}
            </div>
          </div>

          <div className="col gap-3">
            <div className="otp-chip">
              <div className="col gap-1" style={{ gap: 4 }}>
                <span className="lbl">Courier OTP</span>
                <span className="code">{formatOtp(session.courier_otp)}</span>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                <span className="lbl">GPS</span>
                <span className="tag" style={{ color: 'var(--fg-2)' }}>{session.courier_gps || '—'}</span>
              </div>
            </div>

            <div className="otp-chip">
              <div className="col gap-1" style={{ gap: 4 }}>
                <span className="lbl">Client OTP</span>
                <span className="code">{formatOtp(session.client_otp)}</span>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                <span className="lbl">GPS</span>
                <span className="tag" style={{ color: 'var(--fg-2)' }}>{session.client_gps || '—'}</span>
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>State</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-1)' }}>{session.state}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-4)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Lock</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: session.productRemovedLock ? 'var(--alert)' : 'var(--fg-2)' }}>
                {session.productRemovedLock ? 'IRREVERSIBLE · PRODUCT_REMOVED' : 'open'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatOtp(s) {
  if (!s) return '— — —';
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

window.SessionMeta = SessionMeta;
