/* Mission control — animated stepper showing the parcel journey.
   Steps: SEALED → COURIER (handshake + GPS) → CLIENT (handshake) → OPENED → REMOVED
   Live state of session drives which step is "done" and which is "active". */

function MissionControl({ session }) {
  const steps = computeSteps(session);
  const doneIdx = steps.findLastIndex((s) => s.done);
  const activeIdx = steps.findIndex((s, i) => !s.done && (i === doneIdx + 1 || (doneIdx === -1 && i === 0)));
  // track fill: 0 if nothing done, else from step 0 to last-done step.
  const pct = doneIdx <= 0 ? (doneIdx === 0 ? 0 : 0) : (doneIdx / (steps.length - 1)) * 100;

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-2 grow">
          <div className="eyebrow">Live mission control</div>
          <div className="h-hero">
            {labelForState(session)}
          </div>
          <div className="t-muted" style={{ maxWidth: 520, fontSize: 14, lineHeight: 1.55 }}>
            {sublineForState(session)}
          </div>
        </div>

        {(() => { const VB = window.VerdictBadge; return <VB verdict={session?.verdict || null} />; })()}
      </div>

      <div className="stepper mt-10" style={{ marginTop: 36 }}>
        <div className="track"></div>
        <div className="track-fill" style={{ width: `${pct * 0.90}%` }}></div>
        {steps.map((s, i) => {
          const Icon = window.StepIcon;
          return (
            <div key={s.key} className={`step ${s.done ? 'done' : ''} ${i === activeIdx ? 'active' : ''}`}>
              <div className="dot">
                <Icon name={s.icon} />
              </div>
              <div className="lbl">{s.label}</div>
              <div className="sublbl">{s.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function computeSteps(session) {
  const s = session;
  return [
    {
      key: 'seal',
      label: 'Sealed',
      sub: s ? 'Smart Seal armed with two one-time codes'
             : 'Waiting for a Smart Seal to arm',
      icon: 'lock',
      done: !!s
    },
    {
      key: 'courier',
      label: 'Courier handshake',
      sub: s?.courier_authenticated
        ? (s.courier_gps === 'client_home'
            ? 'Courier scanned at the right address'
            : 'Courier scanned at the wrong address')
        : 'Awaiting courier scan at delivery',
      icon: 'truck',
      done: !!s?.courier_authenticated
    },
    {
      key: 'client',
      label: 'Client handshake',
      sub: s?.client_authenticated
        ? 'Recipient confirmed delivery in person'
        : (s?.openedAt
            ? 'Opened with no recipient handshake'
            : 'Awaiting recipient confirmation'),
      icon: 'user',
      done: !!s?.client_authenticated || !!s?.openedAt
    },
    {
      key: 'opened',
      label: 'Box opened',
      sub: s?.openedAt
        ? 'Lid sensor detected the opening'
        : 'Lid sealed, no entry yet',
      icon: 'unlock',
      done: !!s?.openedAt
    },
    {
      key: 'verdict',
      label: 'Verdict',
      sub: verdictBlurb(s),
      icon: 'shield',
      done: !!s?.verdict
    }
  ];
}

function verdictBlurb(s) {
  const code = s?.verdict?.code;
  if (code === 'VERDICT_A') return 'Delivery cleared, no fraud';
  if (code === 'VERDICT_B') return 'Courier theft suspected';
  if (code === 'VERDICT_C') return 'Porch piracy suspected';
  if (code === 'VERDICT_D') return 'Empty-box fraud filed';
  return 'Outcome computed from the evidence';
}

function labelForState(session) {
  if (!session) return 'Waiting for a Smart Seal';
  if (session.verdict?.code === 'VERDICT_A') return 'Delivery clean';
  if (session.verdict?.code === 'VERDICT_B') return 'Courier theft suspected';
  if (session.verdict?.code === 'VERDICT_C') return 'Porch piracy suspected';
  if (session.verdict?.code === 'VERDICT_D') return 'Empty-box fraud filed';
  if (session.openedAt && !session.client_authenticated) return 'Opened without client auth';
  if (session.client_authenticated) return 'Recipient authenticated';
  if (session.courier_authenticated) return 'Courier on premises';
  return 'Parcel sealed · in transit';
}

function sublineForState(session) {
  if (!session) return 'Spin up a scenario or create a session to begin. The stepper will animate as events arrive.';
  const code = session.verdict?.code;
  if (code === 'VERDICT_A') return 'Two handshakes verified, box opened by recipient, product removed cleanly. No further action required.';
  if (code === 'VERDICT_B') return 'Courier GPS did not match the recipient address and the box was opened without recipient auth. Flagged for fraud review.';
  if (code === 'VERDICT_C') return 'Correct delivery GPS, but ≥ 5 s gap before someone other than the recipient opened the box. Porch piracy suspected.';
  if (code === 'VERDICT_D') return 'Lock-irreversible PRODUCT_REMOVED was recorded after a clean handshake, then the recipient claimed the box was empty.';
  if (session.openedAt && !session.client_authenticated) return 'The box has been opened with no recipient handshake. Verdict pending the GPS + gap check.';
  if (session.client_authenticated) return 'Recipient has completed OTP handshake at the expected address. Waiting on BOX_OPENED.';
  if (session.courier_authenticated) return `Courier handshake recorded at ${session.courier_gps}. Waiting on recipient OTP.`;
  return 'Awaiting courier OTP entry. Run a scenario below to script the full flow.';
}

window.MissionControl = MissionControl;
