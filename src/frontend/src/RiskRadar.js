const point = (value, angle, radius, center) => `${center + Math.cos(angle) * radius * value / 100},${center + Math.sin(angle) * radius * value / 100}`;
function RiskRadar({ application }) {
  if (!application) return null;
  const fraudResilience = { LOW: 90, MEDIUM: 60, HIGH: 25 }[application.fraudRisk] || 60;
  const incomeStability = Math.min(100, Math.round(Number(application.annualIncome || 0) / 10000));
  const data = [application.mobileUsageScore, application.transactionBehaviorScore, application.socialSignalScore, incomeStability, fraudResilience];
  const labels = ['Mobile', 'Transactions', 'Social', 'Income', 'Fraud resilience'];
  const center = 120; const radius = 78;
  const angles = data.map((_, i) => -Math.PI / 2 + i * (2 * Math.PI / data.length));
  const polygon = data.map((value, i) => point(value, angles[i], radius, center)).join(' ');
  return <section className="radar-card"><span className="section-kicker">MULTI-SIGNAL PROFILE</span><h3>Credit signal radar</h3><svg viewBox="0 0 240 240" role="img" aria-label="Credit signal radar chart"><polygon points={angles.map(angle => point(100, angle, radius, center)).join(' ')} className="radar-frame" />{[.25,.5,.75].map(level => <polygon key={level} points={angles.map(angle => point(level * 100, angle, radius, center)).join(' ')} className="radar-ring" />)}{angles.map((angle, i) => <g key={labels[i]}><line x1={center} y1={center} x2={point(100, angle, radius, center).split(',')[0]} y2={point(100, angle, radius, center).split(',')[1]} className="radar-axis" /><text x={point(118, angle, radius, center).split(',')[0]} y={point(118, angle, radius, center).split(',')[1]}>{labels[i]}</text></g>)}<polygon points={polygon} className="radar-value" /></svg><p>Income stability and fraud resilience are transparent prototype-derived indicators.</p></section>;
}
export default RiskRadar;
