import { Progress, Tag } from 'antd';

const SIGNAL_LABELS = {
  signalInconsistency: 'Signal incoherence',
  signalIncomeSignalMismatch: 'Income vs signal mismatch',
  signalDocIncomeDivergence: 'Document income divergence',
};

const prettySignal = key => SIGNAL_LABELS[key] || key
  .replace(/^signal/, '')
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, c => c.toUpperCase())
  .trim();

const severityColor = s => (s > 0.6 ? '#ff4d4f' : s > 0.3 ? '#faad14' : '#52c41a');

function FraudHeatmap({ application }) {
  const risk = application?.fraudRisk || 'MEDIUM';
  const subSignals = application?.fraudSubSignals;
  const entries = subSignals
    ? (subSignals instanceof Map ? Array.from(subSignals.entries()) : Object.entries(subSignals))
    : [];

  if (entries.length > 0) {
    return (
      <section className="fraud-heatmap">
        <div className="heatmap-heading">
          <div><span className="section-kicker">FRAUD SIGNAL VIEW</span><h3>Risk signal heatmap</h3></div>
          <Tag color={risk === 'HIGH' ? 'red' : risk === 'LOW' ? 'green' : 'gold'}>{risk} RISK</Tag>
        </div>
        <p>Per-signal fraud sub-indicators as evaluated by the live risk model.</p>
        {entries.map(([name, severity]) => {
          const pct = Math.round((typeof severity === 'number' ? severity : Number(severity) || 0) * 100);
          return (
            <div className="heat-row" key={name}>
              <span>{prettySignal(name)}</span>
              <Progress percent={pct} strokeColor={severityColor(pct / 100)} />
              <strong>{pct}%</strong>
            </div>
          );
        })}
      </section>
    );
  }

  const values = risk === 'HIGH' ? [76, 58, 44, 81] : risk === 'LOW' ? [15, 5, 0, 25] : [38, 21, 16, 48];
  const labels = ['Transaction velocity anomaly', 'Geographic inconsistency', 'Device fingerprint mismatch', 'Behavioral pattern deviation'];
  return <section className="fraud-heatmap"><div className="heatmap-heading"><div><span className="section-kicker">FRAUD SIGNAL VIEW</span><h3>Risk signal heatmap</h3></div><Tag color={risk === 'HIGH' ? 'red' : risk === 'LOW' ? 'green' : 'gold'}>{risk} RISK</Tag></div><p>Prototype risk indicators, derived for visual review not live device intelligence.</p>{labels.map((label, index) => <div className="heat-row" key={label}><span>{label}</span><Progress percent={values[index]} strokeColor={values[index] > 60 ? '#ff4d4f' : values[index] > 30 ? '#faad14' : '#52c41a'} /><strong>{values[index]}%</strong></div>)}</section>;
}

export default FraudHeatmap;
