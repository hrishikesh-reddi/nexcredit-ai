import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Progress, Row, Select, Tag, Tooltip, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, InfoCircleOutlined, PlayCircleOutlined, ReloadOutlined, ThunderboltOutlined, WarningOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, CartesianGrid } from 'recharts';
import { getApplications, getCashflowFeatures, ingestTransactions, simulateAdverseEvent } from './Client';
import { IcPulse } from './icons/NxIcons';

const { Text, Paragraph } = Typography;

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e8eb', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,.08)', fontSize: 12 }}>
      {label && <div style={{ color: '#8a97a6', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.fill, flexShrink: 0 }} />
          <span style={{ color: '#0c1f33', fontWeight: 600 }}>{p.value?.toLocaleString?.() ?? p.value}</span>
        </div>
      ))}
    </div>
  );
}

const FEATURE_META = {
  avgMonthlyCredit: { label: 'Average monthly credit', note: 'mean of all inbound credits over the lookback window' },
  salaryCreditCount: { label: 'Salary credits (6 mo)', note: 'count of recurring employer-like credits' },
  lowBalanceDays: { label: 'Low-balance days / month', note: 'days closing below the buffer threshold' },
  returnedPayments: { label: 'Returned payments (6 mo)', note: 'bounced / failed debits' },
  incomeVolatility: { label: 'Income volatility', note: 'coefficient of variation across months' },
  savingsTrend: { label: 'Savings trend', note: 'slope of month-end balance' },
  cashflowScore: { label: 'Cash-flow score', note: 'composite of the signals above' },
};

const radarScale = {
  avgMonthlyCredit: v => Math.min(100, (v / 60000) * 100),
  salaryCreditCount: v => Math.min(100, (v / 6) * 100),
  lowBalanceDays: v => Math.max(0, 100 - (v / 30) * 100),
  returnedPayments: v => Math.max(0, 100 - (v / 5) * 100),
  incomeVolatility: v => Math.max(0, 100 - v * 100),
  savingsTrend: v => Math.min(100, 50 + v * 25),
};

function FeatureCard({ meta, value, delta, deriveNote }) {
  const isScore = meta.key === 'cashflowScore';
  const display = isScore ? value : value;
  const deltaTone = delta == null ? null : delta > 0 ? 'pos' : delta < 0 ? 'neg' : null;
  return (
    <Card size="small" className="nx-cash-card" styles={{ body: { padding: 14 } }}>
      <div className="nx-kpi-label">{meta.label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
        <b style={{ fontSize: 20, color: isScore ? (value >= 70 ? '#0f9d6b' : value >= 50 ? '#c98a14' : '#e5484d') : '#0b1f3a' }}>
          {typeof display === 'number' ? (isScore ? `${display}` : display.toLocaleString('en-IN')) : display}
        </b>
        {delta != null && (
          <span className={`nx-pill ${deltaTone}`} style={{ fontSize: 11 }}><i />
            {delta > 0 ? <ArrowUpOutlined /> : delta < 0 ? <ArrowDownOutlined /> : null} {Math.abs(delta)}
          </span>
        )}
      </div>
      <Tooltip title={deriveNote || meta.note}>
        <div className="nx-cash-note">
          <InfoCircleOutlined /> {deriveNote || meta.note}
        </div>
      </Tooltip>
    </Card>
  );
}

export default function CashflowIntelligence({ applications: propApps = [], onReason }) {
  const [appId, setAppId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [features, setFeatures] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [eventResult, setEventResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (propApps && propApps.length) {
      setApplications(propApps);
      setAppId(propApps[0].id);
      setLoading(false);
      return;
    }
    getApplications()
      .then(apps => {
        setApplications(apps);
        if (apps.length) setAppId(apps[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (appId == null || loadError) return;
    const t = setInterval(() => {
      if (ingesting || simulating) return;
      getCashflowFeatures(appId)
        .then(result => setFeatures(result))
        .catch(() => setLoadError(true));
    }, 20000);
    return () => clearInterval(t);
  }, [appId, ingesting, simulating, loadError]);

  const loadFeatures = (id, keepBaseline) => {
    if (id == null) return;
    setLoadError(false);
    setIngesting(true);
    ingestTransactions(id)
      .catch(() => {})
      .then(() => getCashflowFeatures(id))
      .then(result => {
        setFeatures(result);
        if (keepBaseline) setBaseline(result); else setBaseline(null);
        setEventResult(null);
        setIngesting(false);
        setLoadError(false);
      })
      .catch(() => { setIngesting(false); setLoadError(true); });
  };

  useEffect(() => { if (appId != null) loadFeatures(appId, true); }, [appId]); // eslint-disable-line react-hooks/exhaustive-deps

  const runEvent = eventType => {
    if (appId == null) return;
    setSimulating(true);
    simulateAdverseEvent(appId, eventType)
      .then(() => getCashflowFeatures(appId))
      .then(result => { setEventResult({ eventType, features: result }); setSimulating(false); })
      .catch(() => setSimulating(false));
  };

  const featureRows = useMemo(() => {
    if (!features) return [];
    return Object.keys(FEATURE_META)
      .filter(key => features[key] != null)
      .map(key => {
        const before = baseline?.[key];
        const after = eventResult?.features?.[key];
        const delta = before != null && after != null ? Number((after - before).toFixed(2)) : null;
        return { key, meta: FEATURE_META[key], value: features[key], delta: eventResult ? delta : null };
      });
  }, [features, baseline, eventResult]);

  const current = eventResult ? eventResult.features : features;
  const cashflowScore = current?.cashflowScore;
  const selectedApp = applications.find(app => app.id === appId);
  const decisionTone = selectedApp ? (selectedApp.creditDecision === 'APPROVED' ? 'pos' : selectedApp.creditDecision === 'REJECTED' ? 'neg' : 'warn') : 'warn';

  return (
    <div>
      <header className="nx-pagehead">
        <div>
          <h1>Cash-flow Intelligence</h1>
          <p>Alternative-data signal from consented bank statements, layered over the bureau-style decision. This is the PRISM-style overlay: thin-files get a fair read instead of an instant decline.</p>
        </div>
        <div className="nx-pagehead-actions">
          <span className="nx-live-badge">LIVE · re-underwriting on event</span>
          <Button icon={<ReloadOutlined />} loading={ingesting} onClick={() => loadFeatures(appId, true)}>Re-ingest</Button>
        </div>
      </header>

      <section className="nx-card" style={{ marginBottom: 16 }}>
        <header className="nx-card-head">
          <h3><IcPulse width={16} height={16} /> Select applicant to analyze</h3>
          <span className="nx-sub">{applications.length ? `${applications.length} cases in portfolio · synthetic bank data in demo` : 'no applications yet'}</span>
        </header>
        <div className="nx-card-body" style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Select showSearch optionFilterProp="label" style={{minWidth:280, flex:'1 1 320px', maxWidth:420}} value={appId ? String(appId) : undefined} onChange={v=> setAppId(Number(v))} disabled={!applications.length} placeholder="Select an applicant" options={applications.map(app=>({value:String(app.id),label:`#${app.id} ${app.applicantName} · ${app.employmentType?.replaceAll('_',' ')} · ${app.creditDecision}`}))} />
            {selectedApp && <span className={`nx-pill ${decisionTone}`}><i />{selectedApp.creditDecision}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--nx-muted)', background: 'var(--nx-surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--nx-line)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#1f6feb', flexShrink: 0 }}>ⓘ</span>
            <span>Pick a case above → see their 6 cash-flow signals (avg credit, salary regularity, low-balance days…) computed from the consented statement. Below you can simulate adverse events (job loss, new EMI) and watch the score re-underwrite in real time. In production this connects via Account Aggregator / Plaid; here we use deterministic synthetic transactions per applicant.</span>
          </div>
          {!applications.length && <Empty description="Create an application first to see cash-flow intelligence." />}
          {applications.length > 0 && !features && !loading && !loadError && <Text type="secondary">Computing cash-flow overlay…</Text>}
          {loadError && !features && (
            <Alert type="error" message="Cash-flow data unavailable" description="Backend offline or no statement found. Mock score shown." action={<Button size="small" type="primary" onClick={() => loadFeatures(appId, true)}>Retry</Button>} />
          )}
          {loading && <Text type="secondary">Loading statements…</Text>}
        </div>
      </section>

      {features && (
        <div style={{display:'grid', gap:16}}>
          <Alert
            type={selectedApp?.cashflowUplift > 0 ? 'success' : 'default'}
            showIcon icon={<ThunderboltOutlined />}
            className="nx-cash-impact"
            style={{margin:0}}
            message="Decision impact · cash-flow second look"
            description={selectedApp?.cashflowUplift > 0
              ? `Consented statement lifted this application's confidence by +${selectedApp.cashflowUplift} points. A bureau-only lender would have lacked this read and likely referred or declined it.`
              : 'Consented statement was reviewed but did not move the decision (signals below the healthy threshold).'}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="nx-cash-card" styles={{ body: { padding: 16 } }}>
                <div className="nx-kpi-label">Cash-flow score</div>
                <Progress type="dashboard" percent={cashflowScore ?? 0} strokeColor={cashflowScore >= 70 ? '#0f9d6b' : cashflowScore >= 50 ? '#c98a14' : '#e5484d'} />
                <Text type="secondary" style={{ fontSize: 12 }}>{cashflowScore >= 70 ? 'healthy' : cashflowScore >= 50 ? 'watch' : 'strained'} cash-flow profile</Text>
              </Card>
            </Col>
            <Col xs={24} md={16}>
              <Card styles={{ body: { padding: 16 } }}>
                <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>Cash-flow signal breakdown</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={featureRows.filter(r => r.key !== 'cashflowScore').map(r => ({ name: r.meta.label, value: radarScale[r.key] ? radarScale[r.key](Number(r.value)||0) : Number(r.value)||0, raw: r.value, key: r.key }))} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid horizontal={false} vertical={false} />
                    <XAxis type="number" hide domain={[0,100]} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8a97a6', fontSize: 11 }} width={160} />
                    <ReTooltip content={<ChartTooltip />} cursor={false} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                      {featureRows.filter(r => r.key !== 'cashflowScore').map((r, i) => (
                        <Cell key={i} fill={r.key === 'lowBalanceDays' || r.key === 'returnedPayments' || r.key === 'incomeVolatility' ? '#e5484d' : '#1f6feb'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {current?.explanation && (
            <Alert
              type={eventResult ? 'warning' : 'info'}
              showIcon
              message={eventResult ? `After ${eventResult.eventType.replaceAll('_', ' ')}` : 'Why this score moved the decision'}
              description={
                <div>
                  <Paragraph style={{ marginBottom: 6 }}>{current.explanation}</Paragraph>
                  {current?.reasonCodes?.length > 0 && (
                    <div>{current.reasonCodes.map(code => <Tag key={code} color={eventResult ? 'volcano' : 'blue'}>{code}</Tag>)}</div>
                  )}
                  {current?.appliedToDecision && (
                    <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0, marginTop: 6 }}>
                      This overlay was folded into the recommendation: {current.appliedToDecision}
                    </Paragraph>
                  )}
                </div>
              }
            />
          )}

          {/* Cash-flow profile radar */}
          <section className="nx-card">
            <header className="nx-card-head">
              <h3>Cash-flow profile</h3>
              <span className="nx-sub">radar view of the 6 signals</span>
            </header>
            <div className="nx-card-body" style={{ display: 'flex', justifyContent: 'center', margin: '8px 24px' }}>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart outerRadius="70%" margin={{ top: 20, right: 40, bottom: 20, left: 40 }} data={featureRows.filter(r => r.key !== 'cashflowScore').map(r => ({ subject: ({avgMonthlyCredit:'Avg credit', salaryCreditCount:'Salary cnt', lowBalanceDays:'Low bal days', returnedPayments:'Returns', incomeVolatility:'Volatility', savingsTrend:'Savings trend'}[r.key] || r.meta.label), value: radarScale[r.key] ? radarScale[r.key](Number(r.value)||0) : Number(r.value)||0, fullMark: 100 }))}>
                  <PolarGrid stroke="#eef2f6" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#8a97a6', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Cash-flow" dataKey="value" stroke="#1f6feb" fill="#1f6feb" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="nx-card">
            <header className="nx-card-head">
              <h3><ThunderboltOutlined /> Live adverse-event simulation</h3>
              <span className="nx-sub">watch the engine re-underwrite in real time</span>
            </header>
            <div className="nx-card-body" style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, rowGap: 8, flexWrap: 'wrap' }}>
                <Button icon={<PlayCircleOutlined />} loading={simulating} onClick={() => runEvent('NEW_EMI')}>Add new EMI</Button>
                <Button danger loading={simulating} onClick={() => runEvent('JOB_LOSS')}>Simulate job loss</Button>
                <Button loading={simulating} onClick={() => runEvent('INCOME_DROP')}>Income drop</Button>
                <Button size="middle" onClick={() => { setEventResult(null); setBaseline(features); }}>Reset</Button>
              </div>
              <Row gutter={[12, 12]}>
                {featureRows.map(row => (
                  <Col xs={12} md={6} key={row.key}>
                    <FeatureCard meta={row.meta} value={row.value} delta={row.delta} />
                  </Col>
                ))}
              </Row>
              {eventResult && (
                <Alert
                  type={eventResult.features.cashflowScore < (baseline?.cashflowScore ?? 999) ? 'error' : 'success'}
                  showIcon
                  icon={eventResult.features.cashflowScore < (baseline?.cashflowScore ?? 999) ? <WarningOutlined /> : <ArrowUpOutlined />}
                  message={`${eventResult.eventType.replaceAll('_', ' ')}: cash-flow score ${eventResult.features.cashflowScore} (was ${baseline?.cashflowScore})`}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
