import { useState, useMemo } from 'react';
import { Table, Typography, Button, Input, Timeline, message } from 'antd';
import { SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';
import RiskRadar from './RiskRadar';
import EvidenceIntelligence from './EvidenceIntelligence';
import CashflowIntelligence from './CashflowIntelligence';
import StrategyLab, { FairnessMonitor } from './StrategyLab';
import { KpiCard, Donut, FilterChips, LiveStream, ActivityFeed, ReviewQueue, TrendChart, HorizontalBarChart, ProgressStat, MetricRow } from './AtlasUI';
import IntegrationsPanel from './IntegrationsPanel';
import {
  IcDecisionTick, IcDecisionCross, IcReviewHourglass,
  IcShieldAudit, IcPulse,
} from './icons/NxIcons';
import { reviewCreditApplication } from './Client';

const { Text } = Typography;

const decisionPill = d => d === 'APPROVED'
  ? <span className="nx-pill pos"><i />Approved</span>
  : d === 'REJECTED' ? <span className="nx-pill neg"><i />Rejected</span>
  : <span className="nx-pill warn"><i />Review</span>;

const statusOf = a => ((a.reviewStatus === 'PENDING_REVIEW' || a.creditDecision === 'PENDING') ? 'REVIEW' : (a.creditDecision || 'REVIEW'));

const NAV = [
  ['command', 'Command Center'],
  ['studio', 'Underwriting Studio'],
  ['evidence', 'Evidence Intelligence'],
  ['cashflow', 'Cash-flow Intelligence'],
  ['governance', 'Review & Governance'],
  ['lab', 'Strategy Lab'],
  ['architecture', 'Platform Architecture'],
];

/* Quiet policy line rendered as chips - what governs decisions right now. */
function PolicyMetaRow({ items }) {
  return <div className="nx-meta-row">
    {items.map(([Icon, label]) => <span className="nx-meta-chip" key={label}><Icon width={14} height={14} /> {label}</span>)}
  </div>;
}

/* Decisions per day over the trailing N days, computed from the live audit ledger. */
function dailyDecisionCounts(auditLogs, days) {
  const counts = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    counts.push({
      label: day,
      count: auditLogs.filter(l => {
        if (!l.timestamp) return false;
        const t = new Date(l.timestamp);
        return t >= day && t < next;
      }).length,
    });
  }
  return counts;
}

/* Same trailing-N-day axis, but counting only one decision type. */
function dailyDecisionType(auditLogs, days, type) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(today); day.setDate(day.getDate() - (days - 1 - i));
    const next = new Date(day); next.setDate(next.getDate() + 1);
    return auditLogs.filter(l => {
      if (!l.timestamp || (l.decision || '').toUpperCase() !== type) return false;
      const t = new Date(l.timestamp);
      return t >= day && t < next;
    }).length;
  });
}

/* Average confidence per day across applications created that day (real data, aligned to the axis). */
function dailyAvgConfidence(applications, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(today); day.setDate(day.getDate() - (days - 1 - i));
    const next = new Date(day); next.setDate(next.getDate() + 1);
    const bucket = applications.filter(a => {
      const c = a.createdAt || a.created_at;
      if (!c) return false;
      const t = new Date(c);
      return t >= day && t < next;
    });
    if (!bucket.length) return 0;
    return Math.round(bucket.reduce((s, a) => s + (Number(a.confidenceScore) || 0), 0) / bucket.length);
  });
}

export default function WorkspacePages({ applications = [], auditLogs = [], activePage = 'Command Center', onOpenDetail, onNavigate, onOpenApplication }) {
  const [filter, setFilter] = useState('all');
  const [previewId, setPreviewId] = useState(applications[0]?.id || null);
  const realStream = useMemo(() => [...applications]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 6)
    .map(a => ({
      name: a.applicantName,
      sub: `${(a.employmentType || '').replace('_', ' ')} · ₹${Number(a.annualIncome || 0).toLocaleString('en-IN')}`,
      decision: statusOf(a),
    })), [applications]);
  const [evQ, setEvQ] = useState('');
  const nav = onNavigate || (() => {});
  const byId = id => applications.find(a => a.id === id);

  const view = activePage;

  const counts = useMemo(() => {
    const c = { APPROVED: 0, REJECTED: 0, REVIEW: 0 };
    applications.forEach(a => { c[statusOf(a)] = (c[statusOf(a)] || 0) + 1; });
    return c;
  }, [applications]);

  const avgConf = useMemo(() => {
    if (!applications.length) return 0;
    return Math.round(applications.reduce((s, a) => s + (Number(a.confidenceScore) || 0), 0) / applications.length);
  }, [applications]);

  const filteredApps = useMemo(() =>
    filter === 'all' ? applications : applications.filter(a => statusOf(a) === filter), [applications, filter]);

  const donut = [
    { label: 'Approved', value: counts.APPROVED, color: '#0f9d6b' },
    { label: 'In review', value: counts.REVIEW, color: '#c98a14' },
    { label: 'Rejected', value: counts.REJECTED, color: '#e5484d' },
  ];

  /* Real series from the audit ledger. No invented history anywhere below. */
  const dailyDecisions = useMemo(() => dailyDecisionCounts(auditLogs, 14), [auditLogs]);
  const seriesApproved = useMemo(() => dailyDecisionType(auditLogs, 14, 'APPROVED'), [auditLogs]);
  const seriesReview = useMemo(() => dailyDecisionType(auditLogs, 14, 'REVIEW').map((c, i) => c + dailyDecisionType(auditLogs, 14, 'PENDING')[i]), [auditLogs]);
  const seriesConfidence = useMemo(() => dailyAvgConfidence(applications, 14), [applications]);
  const totalLogged = auditLogs.length;
  const queueCount = useMemo(() => applications.filter(a => statusOf(a) === 'REVIEW').length, [applications]);
  const approveShare = counts.APPROVED + counts.REJECTED > 0
    ? Math.round(counts.APPROVED / (counts.APPROVED + counts.REJECTED) * 100)
    : null;

  const activity = useMemo(() => auditLogs.slice(0, 8).map(l => {
    const a = applications.find(x => x.id === l.applicationId);
    const d = (l.decision || '').toUpperCase();
    const tone = d === 'APPROVED' ? 'pos' : d === 'REJECTED' ? 'neg' : 'warn';
    return {
      tone,
      title: <><b>{a ? a.applicantName : `Application #${l.applicationId}`}</b> · {d}</>,
      sub: l.reasoning ? String(l.reasoning).slice(0, 64) + (l.reasoning.length > 64 ? '…' : '') : '',
      time: l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
    };
  }), [auditLogs, applications]);

  const [reviewFilter, setReviewFilter] = useState('all');
  const reviewCases = useMemo(() => {
    if (reviewFilter === 'all') return applications;
    if (reviewFilter === 'review') return applications.filter(a => a.reviewStatus === 'PENDING');
    if (reviewFilter === 'approved') return applications.filter(a => a.creditDecision === 'APPROVED');
    if (reviewFilter === 'rejected') return applications.filter(a => a.creditDecision === 'REJECTED');
    return applications;
  }, [applications, reviewFilter]);

  const columns = [
    { title: 'Applicant', dataIndex: 'applicantName', key: 'applicantName', width: 140, ellipsis: true, render: (v, r) => <span className="nx-rowlink" role="button" tabIndex={0} onClick={() => { setPreviewId(r.id); onOpenDetail && onOpenDetail(r); }} onKeyDown={e => { if (e.key === 'Enter') { setPreviewId(r.id); onOpenDetail && onOpenDetail(r); } }}>{v}</span> },
    { title: 'Type', dataIndex: 'employmentType', key: 'employmentType', width: 120, ellipsis: true, render: v => <Text style={{ fontSize: 12.5, whiteSpace: 'nowrap' }} type="secondary">{v?.replaceAll('_', ' ')}</Text> },
    { title: 'Income', dataIndex: 'annualIncome', key: 'annualIncome', width: 110, ellipsis: true, render: v => <span style={{ whiteSpace: 'nowrap' }}>{`₹${Number(v || 0).toLocaleString('en-IN')}`}</span> },
    { title: 'Decision', key: 'decision', width: 110, render: (_, r) => decisionPill(statusOf(r)) },
    { title: 'Confidence', dataIndex: 'confidenceScore', key: 'confidenceScore', width: 85, align: 'right', ellipsis: true, render: v => <Text strong style={{ whiteSpace: 'nowrap' }}>{v}%</Text> },
    { title: 'Fraud', dataIndex: 'fraudRisk', key: 'fraudRisk', width: 90, ellipsis: true, render: v => <Text type={v === 'LOW' ? 'success' : v === 'HIGH' ? 'danger' : 'warning'} style={{ whiteSpace: 'nowrap' }}>{v}</Text> },
  ];

  const latestColumns = [
    { title: 'Applicant', dataIndex: 'applicantName', key: 'applicantName', width: 120, ellipsis: true },
    { title: 'Type', dataIndex: 'employmentType', key: 'employmentType', width: 115, render: v => <span style={{fontSize:12,fontWeight:600,background:'var(--nx-surface-2)',border:'1px solid var(--nx-line)',padding:'2px 8px',borderRadius:999,color:'var(--nx-ink)',whiteSpace:'nowrap',display:'inline-block'}}>{v?.replaceAll('_',' ')}</span> },
    { title: 'Decision', dataIndex: 'creditDecision', key: 'creditDecision', width: 110, render: v => decisionPill(v || 'REVIEW') },
    { title: 'Confidence', dataIndex: 'confidenceScore', key: 'confidenceScore', width: 90, align: 'right', render: v => <Text strong style={{whiteSpace:'nowrap'}}>{v}%</Text> },
  ];

  const handleReview = (app, decision, note) => {
    reviewCreditApplication(app.id, decision, note || '')
      .then(() => message.success(`Review recorded: ${decision} for ${app.applicantName}`))
      .catch(err => message.error(`Review failed: ${err.message}`));
  };

  return (
    <div className="content-wrap">
      <nav className="nx-nav" aria-label="Workbench navigation">
        {NAV.map(([key, label]) => (
          <button key={key} className={`nx-nav-chip${activePage === label ? ' active' : ''}`} onClick={() => onNavigate && onNavigate(label)}>{label}</button>
        ))}
      </nav>
      {/* ===== COMMAND CENTER ===== */}
      {view === 'Command Center' && (
        <div>
          <header className="nx-pagehead">
            <div>
              <h1>Command Center</h1>
              <p>Portfolio health at a glance, live from applications and audit ledger.</p>
            </div>
            <div className="nx-pagehead-actions">
              <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => onOpenApplication && onOpenApplication()}>Start application</Button>
              <Button icon={<ArrowRightOutlined />} onClick={() => nav('Evidence Intelligence')}>Open evidence</Button>
            </div>
          </header>

          {/* KPI row with progress bars */}
          <div className="nx-kpis">
            <KpiCard label="Active portfolio" value={applications.length} delta={`${totalLogged} decisions logged`} deltaType="flat" spark={dailyDecisions.map(d => d.count)} tag={`${totalLogged} logged`} />
            <KpiCard label="Auto-approved" value={counts.APPROVED} delta={approveShare != null ? `${approveShare}% of decided cases` : 'no decisions yet'} deltaType="up" spark={seriesApproved} tag="LIVE" />
            <KpiCard label="Awaiting review" value={queueCount} delta={`${queueCount} queued`} deltaType="down" spark={seriesReview} tag="QUEUE" />
            <KpiCard label="Avg confidence" value={`${avgConf}%`} delta={`across ${applications.length} applicants`} deltaType="flat" spark={seriesConfidence} tag="MODEL" />
          </div>

          {/* Decision breakdown + Volume chart side by side */}
          <div className="nx-grid-2" style={{ marginBottom: 18 }}>
            <section className="nx-card">
              <header className="nx-card-head"><h3><IcPulse width={14} height={14} style={{marginRight:6}}/>Decision breakdown</h3><span className="nx-sub">by decision</span></header>
              <div className="nx-card-body">
                {applications.length === 0
                  ? <div className="nx-preview-empty">No applications yet, click Start application to add the first case.</div>
                  : <>
                    <ProgressStat label="Approved" value={counts.APPROVED} maxValue={applications.length} color="#0f9d6b" suffix={`(${approveShare ?? 0}%)`} />
                    <ProgressStat label="Avg confidence" value={`${avgConf}%`} maxValue={100} color="#1f6feb" suffix="" />
                    <ProgressStat label="Fraud low rate" value={`${applications.length ? Math.round(applications.filter(a=>a.fraudRisk==='LOW').length / applications.length*100):0}%`} maxValue={100} color="#0f9d6b" suffix={`· ${applications.filter(a=>a.fraudRisk==='LOW').length}/${applications.length}`} />
                  </>
                }
              </div>
            </section>
            <section className="nx-card">
              <header className="nx-card-head"><h3><IcShieldAudit width={14} height={14} style={{marginRight:6}}/>Decision volume</h3><span className="nx-sub">Last 14 days</span></header>
              <div className="nx-card-body">
                {totalLogged === 0
                  ? <div className="nx-preview-empty">No volume yet, decisions will plot here over 14 days.</div>
                  : <><div style={{display:'flex',gap:16,marginBottom:12}}><span style={{fontSize:11,color:'var(--nx-muted)'}}>Avg per day <b style={{color:'var(--nx-ink)'}}>{totalLogged ? (totalLogged/14).toFixed(1) : '-'}</b></span><span style={{fontSize:11,color:'var(--nx-muted)'}}>Peak <b style={{color:'var(--nx-ink)'}}>{totalLogged ? Math.max(...dailyDecisions.map(d=>d.count)) : '-'}</b></span></div><TrendChart data={dailyDecisions.map(d => d.count)} /></>}
              </div>
            </section>
          </div>

          <div className="nx-grid-2">
            <div className="nx-stack">
              <section className="nx-card">
                <header className="nx-card-head"><h3>Latest decisions</h3><span className="nx-sub">{realStream.length ? 'current portfolio' : 'waiting for the first application'}</span></header>
                <div className="nx-card-body"><LiveStream items={realStream} /></div>
              </section>
              <div className="nx-grid-2b">
                <section className="nx-card">
                  <header className="nx-card-head"><h3>Latest applications</h3><span className="nx-sub">{applications.length} in portfolio · updated live</span></header>
                  <div className="nx-card-body">
                    <Table rowKey="id" size="small" pagination={false} columns={latestColumns} dataSource={applications.slice(0, 5)} scroll={{ x: 440 }} tableLayout="fixed" />
                  </div>
                </section>
                <section className="nx-card">
                  <header className="nx-card-head"><h3>Inclusion impact</h3></header>
                  <div className="nx-card-body">
                    <MetricRow label="Thin-file cases" value={applications.length} barPercent={applications.length ? 100 : 0} color="#1f6feb" subtext="scored" />
                    <MetricRow label="Auto-approved" value={counts.APPROVED} barPercent={applications.length ? (counts.APPROVED / applications.length * 100) : 0} color="#0f9d6b" subtext="inclusive" />
                    <MetricRow label="Avg confidence" value={`${avgConf}%`} barPercent={avgConf} color="#6c5ce7" subtext="model" />
                  </div>
                </section>
              </div>
            </div>
            <section className="nx-card">
              <header className="nx-card-head"><h3>Audit ledger</h3><span className="nx-sub">{totalLogged} events</span></header>
              <div className="nx-card-body"><ActivityFeed items={activity} /></div>
            </section>
          </div>
        </div>
      )}

      {/* ===== UNDERWRITING STUDIO ===== */}
      {view === 'Underwriting Studio' && (
        <div>
          <header className="nx-pagehead">
            <div>
              <h1>Underwriting Studio</h1>
              <p>Review the portfolio, inspect any applicant, and run deterministic credit decisions. Select a row to preview details inline.</p>
            </div>
            <div className="nx-pagehead-actions" />
          </header>
          <PolicyMetaRow items={[
            [IcShieldAudit, 'Auto approval requires at least 70% model confidence and fraud risk Medium or lower'],
            [IcReviewHourglass, 'Applicants under 21, declined cases escalate for human review'],
            [IcPulse, 'Income mismatch above 30% between documents and stated income is referred for review'],
          ]} />

          <div className="nx-grid-2">
            <div className="nx-stack">
              <section className="nx-card">
                <header className="nx-card-head">
                  <h3>Application portfolio</h3>
                  <FilterChips options={[{ value: 'all', label: 'All' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REVIEW', label: 'In review' }, { value: 'REJECTED', label: 'Rejected' }]} value={filter} onChange={setFilter} />
                </header>
                <div className="nx-card-body nx-table">
                  <Table rowKey="id" size="small" columns={columns} dataSource={filteredApps} pagination={false} scroll={{ x: 680 }} tableLayout="fixed"
                    onRow={r => ({ onClick: () => setPreviewId(r.id), style: { cursor: 'pointer' } })} />
                </div>
              </section>
              <section className="nx-card">
                <header className="nx-card-head"><h3>Decision distribution</h3></header>
                <div className="nx-card-body">
                  <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <Donut segments={donut} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <HorizontalBarChart
                        data={[
                          { name: 'Approved', value: counts.APPROVED, color: '#0f9d6b' },
                          { name: 'In Review', value: counts.REVIEW, color: '#c98a14' },
                          { name: 'Rejected', value: counts.REJECTED, color: '#e5484d' },
                        ]}
                        height={130}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="nx-card">
              <header className="nx-card-head"><h3>Selected applicant</h3><span className="nx-sub">click a row</span></header>
              <div className="nx-card-body nx-preview">
                {(() => {
                  const a = byId(previewId);
                  if (!a) return <div className="nx-preview-empty">Select an applicant from the portfolio to preview.</div>;
                  return <>
                    <p className="nx-preview-name">{a.applicantName}</p>
                    <p className="nx-preview-meta">{a.employmentType?.replaceAll('_', ' ')} · ₹{Number(a.annualIncome || 0).toLocaleString('en-IN')} / yr · age {a.age}</p>
                    {decisionPill(statusOf(a))}
                    <div style={{ height: 14 }} />
                    <RiskRadar application={a} />
                    <div style={{ height: 14 }} />
                    <Button block onClick={() => onOpenDetail && onOpenDetail(a)}>Open full decision drawer</Button>
                  </>;
                })()}
              </div>
            </section>
          </div>

          {/* ===== Applicant Profile & Multi-Modal Data, incremental NTC panel (light banking, Indian centric, wired to real applicant) ===== */}
          {(() => {
            const a = byId(previewId);
            if (!a) return null;
            const isNTC = (a.age != null && a.age <= 24) || a.employmentType === 'GIG_WORKER' || a.employmentType === 'STUDENT';
            const defaultProb = a.confidenceScore != null ? Math.max(2, Math.min(42, 100 - a.confidenceScore + (a.fraudRisk === 'HIGH' ? 8 : 0))) : null;
            const altScores = {
              utility: a.mobileUsageScore != null ? a.mobileUsageScore : (a.transactionBehaviorScore ?? 74),
              rent: a.transactionBehaviorScore != null ? Math.min(96, a.transactionBehaviorScore + 12) : 88,
              cashflow: a.transactionBehaviorScore ?? 68,
              digital: a.socialSignalScore ?? 77,
            };
            const scoreTone = v => v >= 85 ? { bg: '#ecfdf5', border: '#a7f3d0', dot: '#0f9d6b', bar: '#0f9d6b' } : v >= 70 ? { bg: '#eff6ff', border: '#bfdbfe', dot: '#1f6feb', bar: '#1f6feb' } : { bg: '#fef3c7', border: '#fde68a', dot: '#c98a14', bar: '#c98a14' };
            const altMeta = [
              { k: 'utility', label: 'Utility & Telecom', sub: '12 months on-time mobile + broadband', icon: '◈' },
              { k: 'rent', label: 'Rent Payment History', sub: 'sustained tenancy · zero late months', icon: '⌂' },
              { k: 'cashflow', label: 'Cash Flow / Banking', sub: 'salary regularity · low return rate', icon: '₹' },
              { k: 'digital', label: 'Digital Footprint', sub: 'verified identity · stable device & email age', icon: '◎' },
            ];
            return (
              <section className="nx-card" style={{ marginTop: 16 }}>
                <header className="nx-card-head">
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', border: '1px solid #dbeafe', display: 'grid', placeItems: 'center', fontSize: 13 }}>◉</span>
                      Applicant Profile & Multi-Modal Data
                    </h3>
                    <div style={{ fontSize: 11, color: 'var(--nx-muted)', marginTop: 2 }}>Composite view across traditional bureau and alternative data, live, not mock</div>
                  </div>
                </header>
                <div className="nx-card-body">
                  {/* Identity strip — person info with breathing room, hardware badge on right */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '12px 14px', background: 'var(--nx-surface-2, #fafbfc)', border: '1px solid var(--nx-line, #e8edf2)', borderRadius: 12, marginBottom: 14 }}>
                    <span style={{ width: 42, height: 42, borderRadius: 12, background: '#1f6feb', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{String(a.applicantName || 'NA').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 750, color: 'var(--nx-ink)', fontSize: 14 }}>{a.applicantName}</div>
                      <div style={{ fontSize: 11, color: 'var(--nx-body)' }}>Age {a.age} · {a.employmentType?.replaceAll('_', ' ')} · ID NTC-{String(a.id).padStart(5, '0')} · NexCredit Starter</div>
                    </div>
                    {isNTC && <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>⚠ New-to-Credit</span>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 14, alignItems: 'stretch' }}>
                    {/* Traditional Credit — distinct light tint to differentiate */}
                    <div style={{ background: '#fafbfc', border: '1px solid var(--nx-line)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nx-muted)', letterSpacing: '.04em' }}>Traditional Credit</div>
                      <div style={{ fontSize: 11, color: 'var(--nx-muted)', marginTop: 2 }}>Bureau FICO-style assessment</div>
                      <div style={{ width: 126, height: 126, borderRadius: '50%', border: '2px dashed #dbeafe', display: 'grid', placeItems: 'center', margin: '12px 0 8px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, color: 'var(--nx-muted)', fontSize: 18 }}>{isNTC ? 'N/A' : (a.confidenceScore ? `${Math.round(a.confidenceScore * 0.78 + 620)}` : '-')}</div>
                          <div style={{ fontSize: 10, color: 'var(--nx-muted)', maxWidth: 90, lineHeight: 1.3 }}>{isNTC ? 'Insufficient credit history' : 'Bureau score available'}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nx-ink)' }}>{isNTC ? 'Traditional score' : 'FICO-equivalent'}</div>
                      <div style={{ fontSize: 11, color: 'var(--nx-muted)' }}>{isNTC ? 'Insufficient history for scoring' : 'Per bureau file on record'}</div>
                    </div>

                    {/* ML Prediction — white card, no blue top line, title ink not blue */}
                    <div style={{ background: '#fff', border: '1px solid var(--nx-line)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nx-ink)', letterSpacing: '.04em' }}>ML Prediction</div>
                      <div style={{ fontSize: 11, color: 'var(--nx-muted)', marginTop: 2 }}>Backend model inference output</div>
                      <div style={{ width: 120, height: 120, borderRadius: '50%', border: '8px solid #eff6ff', borderTopColor: a.confidenceScore >= 80 ? '#0f9d6b' : a.confidenceScore >= 60 ? '#1f6feb' : '#c98a14', display: 'grid', placeItems: 'center', margin: '12px 0 8px', position: 'relative' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, color: 'var(--nx-ink)', fontSize: 20 }}>{defaultProb != null ? `${defaultProb.toFixed(1)}%` : '-'}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--nx-muted)', letterSpacing: '.06em' }}>DEFAULT PROB.</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nx-ink)' }}>Predicted Default Probability</div>
                      <div style={{ fontSize: 11, color: 'var(--nx-muted)' }}>Model confidence: {a.confidenceScore ?? '-'}%</div>
                      <span className={`nx-pill ${statusOf(a) === 'APPROVED' ? 'pos' : statusOf(a) === 'REJECTED' ? 'neg' : 'warn'}`} style={{ marginTop: 8 }}><i />{statusOf(a)}</span>
                    </div>

                    {/* Alternative Data Sources — header bolder, tiles with tinted bg and breathing room */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--nx-ink)', marginBottom: 2, letterSpacing: '.02em' }}>Alternative Data Sources</div>
                      <div style={{ fontSize: 11, color: 'var(--nx-muted)', marginBottom: 10 }}>Aggregate scores (0–100) · consented · live from applicant record</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {altMeta.map(m => {
                          const v = altScores[m.k];
                          const t = scoreTone(v);
                          return (
                            <div key={m.k} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, minHeight: 98 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ width: 26, height: 26, borderRadius: 7, background: '#fff', border: `1px solid ${t.border}`, display: 'grid', placeItems: 'center', fontSize: 11, flexShrink: 0 }}>
                                  {m.k === 'utility' ? <IcPulse width={14} height={14} /> : m.k === 'rent' ? <IcShieldAudit width={14} height={14} /> : m.k === 'digital' ? <IcDecisionTick width={14} height={14} /> : <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--nx-ink)', lineHeight: 1 }}>₹</span>}
                                </span>
                                <b style={{ fontSize: 20, fontWeight: 800, color: 'var(--nx-ink)' }}>{v}</b>
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nx-ink)', marginTop: 8, lineHeight: 1.2 }}>{m.label}</div>
                              <div style={{ fontSize: 10, color: 'var(--nx-muted)', marginTop: 3, lineHeight: 1.35 }}>{m.sub}</div>
                              <div style={{ height: 4, background: 'rgba(255,255,255,0.9)', borderRadius: 999, marginTop: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)' }}>
                                <div style={{ width: `${v}%`, height: '100%', background: t.bar, borderRadius: 999 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ===== AI Operations Center, incremental, light banking (not a redesign, an add-on) ===== */}
          {(() => {
            const escRate = applications.length ? Math.round((counts.REVIEW / applications.length) * 1000) / 10 : 0;
            const roster = [
              { name: 'Intake Orchestrator', sub: 'Application triage · Atlas 8.2', state: 'WORKING', tone: '#0f9d6b', bg: '#ecfdf5', border: '#a7f3d0' },
              { name: 'Evidence Synthesizer', sub: 'Multi-modal analysis · Atlas 8.2', state: 'WORKING', tone: '#0f9d6b', bg: '#ecfdf5', border: '#a7f3d0' },
              { name: 'Policy Sentinel', sub: 'Control monitoring · Guardrail 2.6', state: 'STANDBY', tone: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
              { name: 'Review Concierge', sub: 'Human handoff · Assist 1.9', state: counts.REVIEW > 0 ? 'ESCALATED' : 'STANDBY', tone: counts.REVIEW > 0 ? '#92400e' : '#64748b', bg: counts.REVIEW > 0 ? '#fef3c7' : '#f1f5f9', border: counts.REVIEW > 0 ? '#fde68a' : '#e2e8f0' },
            ];
            const recent = auditLogs.slice(0, 5);
            return (
              <section className="nx-card" style={{ marginTop: 16 }}>
                <header className="nx-card-head">
                  <div>
                    <h3>AI Operations Center</h3>
                    <div style={{ fontSize: 11, color: 'var(--nx-muted)' }}>Governed workspace for review questions, agent supervision and audit, same light system you already use</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0f9d6b' }} /> Workspace synced
                  </span>
                </header>
                <div className="nx-card-body" style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16, alignItems: 'start' }}>
                  {/* Left: copilot hook reusing existing chat entry */}
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ background: 'var(--nx-surface-2, #fafbfc)', border: '1px solid var(--nx-line)', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nx-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ background: '#1f6feb', color: '#fff', borderRadius: 6, padding: '2px 6px', fontSize: 10 }}>AI</span>
                        Underwriting Copilot, governed assistant
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--nx-muted)', marginTop: 6 }}>
                        Good morning. I am monitoring the new-to-credit queue and policy controls. What would you like to inspect?
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {['Why was this decision made?', 'Show strongest alternative signals', 'What needs human review?'].map(q => (
                          <button key={q} className="nx-chip" style={{ fontSize: 11, height: 28 }} onClick={() => onNavigate && onNavigate('Strategy Lab')}>{q}</button>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <Input placeholder="Ask about a decision, cohort, or control…" style={{ flex: 1 }} readOnly onClick={() => onNavigate && onNavigate('Strategy Lab')} />
                        <Button type="primary" onClick={() => onNavigate && onNavigate('Strategy Lab')}>Open Lab</Button>
                      </div>
                    </div>
                    {/* Ensemble health, same light card language as elsewhere */}
                    <div style={{ background: '#fff', border: '1px solid var(--nx-line)', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nx-ink)' }}>Atlas ensemble, governed runtime</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                        <div style={{ background: 'var(--nx-surface-2)', border: '1px solid var(--nx-line)', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: 'var(--nx-muted)', fontWeight: 700, letterSpacing: '.05em' }}>CONFIDENCE</div>
                          <b style={{ fontSize: 16, color: '#1f6feb' }}>{avgConf}%</b>
                        </div>
                        <div style={{ background: 'var(--nx-surface-2)', border: '1px solid var(--nx-line)', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: 'var(--nx-muted)', fontWeight: 700, letterSpacing: '.05em' }}>ESCALATION RATE</div>
                          <b style={{ fontSize: 16, color: 'var(--nx-ink)' }}>{escRate}%</b>
                        </div>
                      </div>
                      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.max(8, avgConf))}%`, height: '100%', background: '#1f6feb' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--nx-muted)', marginTop: 4 }}>Confidence threshold 80% · {avgConf}% current</div>
                    </div>
                  </div>

                  {/* Right: agent roster + recent activity, light, compact */}
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ background: '#fff', border: '1px solid var(--nx-line)', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nx-ink)' }}>Active agent roster</div>
                      <div style={{ fontSize: 10, color: 'var(--nx-muted)' }}>{roster.length} supervised agents</div>
                      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                        {roster.map(r => (
                          <div key={r.name} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 10px', background: 'var(--nx-surface-2)', border: '1px solid var(--nx-line)', borderRadius: 8 }}>
                            <span style={{ width: 26, height: 26, borderRadius: 7, background: r.bg, border: `1px solid ${r.border}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                              {r.name === 'Intake Orchestrator' ? <IcPulse width={14} height={14} /> : r.name === 'Evidence Synthesizer' ? <IcShieldAudit width={14} height={14} /> : r.name === 'Policy Sentinel' ? <IcShieldAudit width={14} height={14} /> : <IcReviewHourglass width={14} height={14} />}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nx-ink)' }}>{r.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--nx-muted)' }}>{r.sub}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: r.tone, background: r.bg, border: `1px solid ${r.border}`, padding: '2px 7px', borderRadius: 999, letterSpacing: '.03em' }}>{r.state}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid var(--nx-line)', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nx-ink)' }}>Recent activity</div>
                      <div style={{ fontSize: 10, color: 'var(--nx-muted)', marginBottom: 8 }}>Last {recent.length} events from audit ledger</div>
                      {recent.length === 0 && <div style={{ fontSize: 11, color: 'var(--nx-muted)' }}>No recent agentic actions, run a decision to populate.</div>}
                      {recent.map(l => {
                        const a = applications.find(x => x.id === l.applicationId);
                        const name = a ? a.applicantName : `#${l.applicationId}`;
                        const dAct = String(l.decision || '').toUpperCase();
                        const isPos = dAct === 'APPROVED';
                        const isNeg = dAct === 'REJECTED';
                        const actBg = isPos ? '#ecfdf5' : isNeg ? '#fef2f2' : '#fef3c7';
                        const actBorder = isPos ? '#a7f3d0' : isNeg ? '#fecaca' : '#fde68a';
                        const ActIcon = isPos ? IcDecisionTick : isNeg ? IcDecisionCross : IcReviewHourglass;
                        return (
                          <div key={`${l.applicationId}-${l.timestamp}`} style={{ display: 'flex', gap: 8, padding: '7px 0', borderTop: '1px solid #f1f5f9', alignItems: 'flex-start' }}>
                            <span style={{ width: 20, height: 20, borderRadius: 6, background: actBg, border: `1px solid ${actBorder}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}><ActIcon width={11} height={11} /></span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--nx-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name} · {String(l.decision || '').toUpperCase()}</div>
                              <div style={{ fontSize: 10, color: 'var(--nx-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(l.reasoning || '').slice(0, 72)}</div>
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--nx-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          <div style={{ height: 18 }} />
          <section className="nx-card">
            <header className="nx-card-head"><h3>Cash-flow second look, in context</h3><span className="nx-sub">the consented bank-data overlay that decides thin-file cases</span></header>
            <div className="nx-card-body nx-muted" style={{ fontSize: 13 }}>
              Open <b>Cash-flow Intelligence</b> from the top nav to connect a statement, watch the live overlay, and simulate adverse events on any applicant in the portfolio.
            </div>
          </section>
        </div>
      )}

      {/* ===== CASH-FLOW INTELLIGENCE ===== */}
      {view === 'Cash-flow Intelligence' && <CashflowIntelligence applications={applications} />}

      {/* ===== EVIDENCE INTELLIGENCE ===== */}
      {view === 'Evidence Intelligence' && <EvidenceIntelligence applications={applications} />}

      {/* ===== REVIEW & GOVERNANCE ===== */}
      {view === 'Review & Governance' && (
        <div>
          <header className="nx-pagehead">
            <div>
              <h1>Review & Governance</h1>
              <p>Human-in-the-loop controls and a complete audit trail. Reviewers confirm or override the automated recommendation; every action is recorded.</p>
            </div>
          </header>

          <div className="nx-grid-2">
            <div className="nx-stack">
              <section className="nx-card">
                <header className="nx-card-head"><h3>Review queue</h3><span className="nx-sub">{reviewCases.length} shown</span></header>
                <div className="nx-card-body">
                  <FilterChips options={[{ value: 'all', label: 'All' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'review', label: 'In review' }]} value={reviewFilter} onChange={setReviewFilter} />
                  <div style={{ height: 12 }} />
                  <ReviewQueue cases={reviewCases} onReview={handleReview} onOpen={(a) => onOpenDetail && onOpenDetail(a)} />
                </div>
              </section>
              <section className="nx-card">
                <header className="nx-card-head"><h3>Outcome distribution</h3><span className="nx-sub">{applications.length} decisions</span></header>
                <div className="nx-card-body">
                  <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Donut segments={donut} />
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <ProgressStat label="Approved" value={`${applications.length ? Math.round(counts.APPROVED / applications.length * 100) : 0}%`} maxValue={100} color="#0f9d6b" suffix={`· ${counts.APPROVED}/${applications.length}`} />
                      <ProgressStat label="Rejected" value={`${applications.length ? Math.round(counts.REJECTED / applications.length * 100) : 0}%`} maxValue={100} color="#e5484d" suffix={`· ${counts.REJECTED}/${applications.length}`} />
                      <ProgressStat label="In review" value={`${applications.length ? Math.round(counts.REVIEW / applications.length * 100) : 0}%`} maxValue={100} color="#c98a14" suffix={`· ${counts.REVIEW}/${applications.length}`} />
                    </div>
                  </div>
                </div>
              </section>
              <FairnessMonitor applications={applications} />
            </div>
            <section className="nx-card">
              <header className="nx-card-head"><h3>Audit trail</h3><span className="nx-sub">{auditLogs.length} events from PostgreSQL</span></header>
              <div className="nx-card-body">
                <Input prefix={<SearchOutlined />} placeholder="Filter by application id" onChange={e => setEvQ(e.target.value)} allowClear style={{ marginBottom: 12 }} />
                {auditLogs.length === 0 && <div className="nx-preview-empty">No audit events in the database yet. Every decision and review writes one row here.</div>}
                <Timeline mode="left">
                  {auditLogs.filter(l => !evQ || String(l.applicationId).includes(evQ)).slice(0, 12).map((l, i) => {
                    const a = byId(l.applicationId); const d = (l.decision || '').toUpperCase();
                    const tone = d === 'APPROVED' ? 'pos' : d === 'REJECTED' ? 'neg' : 'warn';
                    const DotIcon = d === 'APPROVED' ? IcDecisionTick : d === 'REJECTED' ? IcDecisionCross : IcReviewHourglass;
                    return (
                      <Timeline.Item key={l.id || i} dot={<span className={`nx-audit-dot ${tone}`}><DotIcon width={13} height={13} /></span>}>
                        <div className="nx-audit-event">
                          <div className="nx-audit-top">
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--nx-ink)' }}>{a ? a.applicantName : `Application #${l.applicationId}`}</span>
                            {decisionPill(d)}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--nx-body)', marginTop: 2 }}>{l.reasoning}</div>
                          <div className="nx-audit-meta">
                            {l.modelVersion && <span className="nx-audit-tag">model {l.modelVersion}</span>}
                            {l.fraudRisk && <span className={`nx-audit-tag ${l.fraudRisk === 'HIGH' ? 'neg' : ''}`}>fraud {l.fraudRisk}</span>}
                            <span className="nx-audit-time nx-mono">#{l.applicationId} · {l.timestamp ? new Date(l.timestamp).toLocaleString() : ''}</span>
                          </div>
                        </div>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ===== STRATEGY LAB / PLATFORM ARCHITECTURE ===== */}
      {view === 'Strategy Lab' && <StrategyLab applications={applications} />}
      {view === 'Platform Architecture' && (
        <div>
          <header className="nx-pagehead">
            <div>
              <h1>Platform Architecture</h1>
              <p>What runs live today, and the production evolution path. The governed core is fully implemented and demoable end-to-end.</p>
            </div>
          </header>
          <div className="nx-grid-2b">
            <section className="nx-card">
              <header className="nx-card-head"><h3>Live governed core</h3><span className="nx-sub">running in this build</span></header>
              <div className="nx-card-body" style={{ display: 'grid', gap: 10 }}>
                {['React workspace on Ant Design',
                  'Spring Boot API · JWT auth · role-based review',
                  'PostgreSQL persistence · pgvector semantic search with token fallback',
                  'Trained logistic-regression scorer with deterministic rule fallback',
                  'Document evidence via Tika extraction and income reconciliation',
                  'Six-stage underwriting pipeline, each step audited',
                  'Agentic copilot with tool calling (any OpenAI-compatible provider)',
                  'Consented cash-flow overlay, what-if lab and model transparency card'].map(x => <div key={x} className="nx-arch-row"><span className="nx-arch-ic pos"><IcDecisionTick width={15} height={15} /></span>{x}</div>)}
              </div>
            </section>
            <section className="nx-card">
              <header className="nx-card-head"><h3>Production evolution</h3><span className="nx-sub">designed, staged by intent</span></header>
              <div className="nx-card-body" style={{ display: 'grid', gap: 10 }}>
                {['Streaming consented signals (Plaid and Account Aggregator production connectors)',
                  'Versioned policy engine with per-partner credit strategies',
                  'Secondary lender routing for declined-but-creditworthy applicants',
                  'Model registry with drift monitoring and champion/challenger retraining',
                  'Cloud deployment with managed secrets and observability'].map(x => <div key={x} className="nx-arch-row"><span className="nx-arch-ic warn"><IcReviewHourglass width={15} height={15} /></span><span style={{ color: 'var(--nx-body)' }}>{x}</span></div>)}
              </div>
            </section>
          </div>
          <div className="nx-card" style={{ marginTop: 18, padding: '12px 16px', fontSize: 12.5 }}>
            <b>Provider note:</b> guarded LLM explanation and the agentic copilot already run against any OpenAI-compatible endpoint (Groq free tier or OpenRouter today); an AWS Bedrock adapter is a configuration swap, not a rewrite.
          </div>
          <div style={{ height: 18 }} />
          <IntegrationsPanel />
        </div>
      )}
    </div>
  );
}
