/* Scenario runner — four big scenario cards */

const SCENARIOS = [
  { id: 'A', title: 'Clean delivery',   desc: 'Both handshakes verified, box opened, product removed.', accent: '#4ade80' },
  { id: 'B', title: 'Courier theft',    desc: 'Wrong GPS, box opened with no client auth.',             accent: '#f87171' },
  { id: 'C', title: 'Porch piracy',     desc: 'Right GPS, ≥ 5s gap, then unauthorized open.',           accent: '#fbbf24' },
  { id: 'D', title: 'Empty-box fraud',  desc: 'Clean flow, then client disputes EMPTY_BOX.',            accent: '#c084fc' }
];

function ScenarioRunner({ runningScenario, onRun }) {
  return (
    <div className="card">
      <div className="row mb-4" style={{ alignItems: 'center' }}>
        <div>
          <div className="eyebrow">Scenario runner</div>
          <div className="h-card mt-2">Disambiguate any of four outcomes</div>
        </div>
      </div>

      <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className="scn"
            style={{ '--scn-accent': s.accent }}
            disabled={runningScenario && runningScenario !== s.id}
            onClick={() => onRun(s.id)}
          >
            <div className="row" style={{ width: '100%', alignItems: 'center', minHeight: 14 }}>
              {runningScenario === s.id && (
                <span className="right tag" style={{ color: s.accent, borderColor: s.accent }}>
                  RUNNING
                </span>
              )}
            </div>
            <div className="scn-title">{s.title}</div>
            <div className="scn-desc">{s.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

window.ScenarioRunner = ScenarioRunner;
