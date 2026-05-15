/* Verdict badge — animated reveal pill. */

function VerdictBadge({ verdict }) {
  const [revealKey, setRevealKey] = React.useState(null);
  const prev = React.useRef(null);

  React.useEffect(() => {
    if (verdict?.code && verdict.code !== prev.current) {
      prev.current = verdict.code;
      setRevealKey(verdict.code + ':' + Date.now());
    } else if (!verdict?.code) {
      prev.current = null;
    }
  }, [verdict?.code]);

  const code = verdict?.code || null;
  const label = verdict?.label || null;
  const isClean = code === 'VERDICT_A';
  const isFraud = code && code !== 'VERDICT_A';

  return (
    <div
      key={revealKey || 'idle'}
      className={
        'verdict-badge' +
        (code ? ' revealing' : ' idle') +
        (isClean ? ' clean' : '') +
        (isFraud ? ' fraud' : '')
      }
    >
      <span className="v-dot"></span>
      <div className="col gap-1" style={{ gap: 0 }}>
        <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, letterSpacing: '0.18em' }}>
          {code ? code : 'AWAITING VERDICT'}
        </div>
        <div style={{ fontSize: 14, letterSpacing: '0.06em' }}>
          {label || '—'}
        </div>
      </div>
      <span className="shine"></span>
    </div>
  );
}

window.VerdictBadge = VerdictBadge;
