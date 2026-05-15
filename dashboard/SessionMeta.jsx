/* Session meta — session id + OTPs (big monospace), GPS expected */

function SessionMeta({ session, onCourierScan, onClientAuth, onClientDispute }) {
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
            <CourierOtpChip session={session} onSubmit={onCourierScan} />
            <ClientOtpChip session={session} onAuth={onClientAuth} onDispute={onClientDispute} />

            <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>State</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-1)' }}>{prettyState(session)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-4)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Lock</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: session.productRemovedLock ? 'var(--alert)' : 'var(--fg-2)' }}>
                {session.productRemovedLock ? 'Irreversible · product removed' : 'Open'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CourierOtpChip({ session, onSubmit }) {
  const [otp, setOtp] = React.useState('');
  React.useEffect(() => { if (session?.courier_otp) setOtp(session.courier_otp); }, [session?.session_id]);

  return (
    <div className="otp-chip" style={{ flexDirection: 'column', gap: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="lbl">Courier OTP</span>
          <span className="code">{formatOtp(session.courier_otp)}</span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
          <span className="lbl">GPS</span>
          <span className="tag" style={{ color: 'var(--fg-2)' }}>{humanize(session.courier_gps) || '—'}</span>
        </div>
      </div>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        <input
          className="input mono"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter OTP"
          style={{ flex: 1, minWidth: 90, fontSize: 12 }}
        />
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}
                onClick={() => onSubmit?.(otp, 'client_home')} disabled={!session}>
          Scan
        </button>
      </div>
    </div>
  );
}

function ClientOtpChip({ session, onAuth, onDispute }) {
  const [otp, setOtp] = React.useState('');
  React.useEffect(() => { if (session?.client_otp) setOtp(session.client_otp); }, [session?.session_id]);

  return (
    <div className="otp-chip" style={{ flexDirection: 'column', gap: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="lbl">Client OTP</span>
          <span className="code">{formatOtp(session.client_otp)}</span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
          <span className="lbl">GPS</span>
          <span className="tag" style={{ color: 'var(--fg-2)' }}>{humanize(session.client_gps) || '—'}</span>
        </div>
      </div>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        <input
          className="input mono"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter OTP"
          style={{ flex: 1, minWidth: 90, fontSize: 12 }}
        />
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}
                onClick={() => onAuth?.(otp, 'client_home')} disabled={!session}>
          Auth
        </button>
        <button className="btn btn-danger" style={{ fontSize: 12, padding: '6px 14px' }}
                onClick={() => onDispute?.()} disabled={!session}>
          Dispute
        </button>
      </div>
    </div>
  );
}

function formatOtp(s) {
  if (!s) return '— — —';
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

function humanize(s) {
  if (s == null) return '';
  return String(s)
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function prettyState(session) {
  if (!session) return '';
  if (session.verdict?.label && session.state?.startsWith('VERDICT_')) {
    return humanize(session.verdict.label);
  }
  return humanize(session.state);
}

window.SessionMeta = SessionMeta;
