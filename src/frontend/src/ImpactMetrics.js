import { Card, Col, Row, Statistic } from 'antd';

const isNtc = app => ['GIG_WORKER', 'STUDENT', 'SELF_EMPLOYED'].includes(app.employmentType);
const inr = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function ImpactMetrics({ applications }) {
  const ntcApproved = applications.filter(app => isNtc(app) && app.creditDecision === 'APPROVED');
  const expandedIncome = ntcApproved.reduce((sum, app) => sum + Number(app.annualIncome || 0), 0);
  return <section className="impact-section"><div><span className="section-kicker">INCLUSION IMPACT</span><h2>Credit access, made visible</h2></div><Row gutter={[16, 16]}><Col xs={12} lg={6}><Card><Statistic title="NTC customers approved" value={ntcApproved.length} /></Card></Col><Col xs={12} lg={6}><Card><Statistic title="Traditional would not assess" value={applications.filter(isNtc).length} /></Card></Col><Col xs={12} lg={6}><Card><Statistic title="Credit access represented" value={inr(expandedIncome)} /></Card></Col><Col xs={12} lg={6}><Card><Statistic title="Average decision time" value="< 1 sec" /></Card></Col></Row><p className="metric-note">Demo estimates use the seeded new-to-credit cohort and approved applicants’ declared annual-income profiles.</p></section>;
}
export default ImpactMetrics;
