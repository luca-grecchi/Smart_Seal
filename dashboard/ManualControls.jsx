/* Manual controls — pill-tab switch between Courier / Client / Device.
   Lets the user drive the flow by hand when they aren't running a preset. */

function ManualControls({ session, onCourierScan, onClientAuth, onClientDispute, onDeviceEvent }) {
  const [tab, setTab] = React.useState('courier');
  const tabs = [
    { id: 'courier', label: 'Courier' },
    { id: 'client',  label: 'Client' },
    { id: 'device',  label: 'Device' }
  ];

  return (
    <div className="card">
      <div className="row mb-4" style={{ alignItems: 'center' }}>
        <div>
          <div className="eyebrow">Manual controls</div>
          <div className="h-card mt-2">Drive each role by hand</div>
        </div>
        <div className="right pill-row">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={'pill' + (tab === t.id ? ' active' : '')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div key={tab} className="manual-tab">
        {tab === 'courier' && <CourierForm session={session} onSubmit={onCourierScan} />}
        {tab === 'client'  && <ClientForm  session={session} onAuth={onClientAuth} onDispute={onClientDispute} />}
        {tab === 'device'  && <DeviceForm  session={session} onEvent={onDeviceEvent} />}
      </div>
    </div>
  );
}

function CourierForm({ session, onSubmit }) {
  const [otp, setOtp] = React.useState('');
  const [gps, setGps] = React.useState('client_home');
  React.useEffect(() => { if (session?.courier_otp) setOtp(session.courier_otp); }, [session?.session_id]);
  return (
    <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
      <input className="input mono" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Courier OTP" style={{ width: 160 }}/>
      <select className="select" value={gps} onChange={(e) => setGps(e.target.value)}>
        <option value="client_home">client_home</option>
        <option value="courier_depot">courier_depot</option>
        <option value="random_location">random_location</option>
      </select>
      <button className="btn btn-primary" onClick={() => onSubmit(otp, gps)} disabled={!session}>
        Scan courier
      </button>
    </div>
  );
}

function ClientForm({ session, onAuth, onDispute }) {
  const [otp, setOtp] = React.useState('');
  const [gps, setGps] = React.useState('client_home');
  React.useEffect(() => { if (session?.client_otp) setOtp(session.client_otp); }, [session?.session_id]);
  return (
    <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
      <input className="input mono" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Client OTP" style={{ width: 160 }}/>
      <select className="select" value={gps} onChange={(e) => setGps(e.target.value)}>
        <option value="client_home">client_home</option>
        <option value="random_location">random_location</option>
      </select>
      <button className="btn btn-primary" onClick={() => onAuth(otp, gps)} disabled={!session}>
        Authenticate
      </button>
      <button className="btn btn-danger" onClick={onDispute} disabled={!session}>
        Dispute EMPTY_BOX
      </button>
    </div>
  );
}

function DeviceForm({ session, onEvent }) {
  const [light, setLight] = React.useState(850);
  const [accel, setAccel] = React.useState(12.3);
  const [present, setPresent] = React.useState('true');
  const EVENTS = ['SEALED', 'IN_TRANSIT', 'BOX_OPENED', 'PRODUCT_REMOVED', 'TAMPER'];
  const sensor_data = { light: Number(light), accel_norm: Number(accel), product_present: present === 'true' };

  return (
    <div className="col gap-3">
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        {EVENTS.map((e) => (
          <button key={e} className="btn t-mono" style={{ fontSize: 11, letterSpacing: '0.08em' }}
                  onClick={() => onEvent(e, { sensor_data })}
                  disabled={!session}>
            {e}
          </button>
        ))}
        <button className="btn t-mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--amber, #fbbf24)' }}
                onClick={() => onEvent('IMPACT_DETECTED', { severity: 'light', confidence: 0.85, sensor_data })}
                disabled={!session}>
          LIGHT_IMPACT
        </button>
        <button className="btn t-mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--alert, #f87171)' }}
                onClick={() => onEvent('IMPACT_DETECTED', { severity: 'heavy', confidence: 0.95, sensor_data })}
                disabled={!session}>
          HEAVY_IMPACT
        </button>
      </div>
      <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
        <input className="input mono" type="number" value={light} onChange={(e) => setLight(e.target.value)} style={{ width: 110 }}/>
        <input className="input mono" type="number" value={accel} onChange={(e) => setAccel(e.target.value)} style={{ width: 110 }}/>
        <select className="select" value={present} onChange={(e) => setPresent(e.target.value)}>
          <option value="true">product_present=true</option>
          <option value="false">product_present=false</option>
        </select>
      </div>
    </div>
  );
}

window.ManualControls = ManualControls;
