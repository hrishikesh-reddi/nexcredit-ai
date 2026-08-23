import { useState } from 'react';
import { Modal, Input, Button, Typography } from 'antd';
import { IcDecisionCross, IcDecisionTick, IcReviewHourglass } from './icons/NxIcons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

/* ---------- Sparkline ---------- */
export function Sparkline({ data = [], color = '#1f6feb', width = 96, height = 34 }) {
  const nums = (data || []).map(Number).filter(n => !Number.isNaN(n));
  if (!nums.length) return null;
  const max = Math.max(...nums), min = Math.min(...nums);
  const span = (max - min) || 1;
  const coords = nums.map((v, i) => {
    const x = 2 + (i / (nums.length - 1)) * (width - 4);
    const y = (height - 3) - ((v - min) / span) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `2,${height - 2} ${coords.join(' ')} ${width - 2},${height - 2}`;
  return <svg className="nx-kpi-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
    <polygon points={area} fill={color} opacity="0.10" />
    <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>;
}

/* ---------- Donut ---------- */
export function Donut({ segments = [], size = 132, thickness = 16 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return <div className="nx-donut-wrap">
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f6" strokeWidth={thickness} />
      {segments.map(seg => {
        const len = (seg.value / total) * c;
        const el = <circle key={seg.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={thickness}
          strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="round" />;
        offset += len;
        return el;
      })}
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fill: '#0c1f33', fontSize: 22, fontWeight: 700 }}>{total}</text>
      <text x="50%" y="62%" textAnchor="middle" style={{ fill: '#8a97a6', fontSize: 10, fontWeight: 600, letterSpacing: '.04em' }}>TOTAL</text>
    </svg>
    <div className="nx-donut-legend">
      {segments.map(seg => <div className="nx-legend-row" key={seg.label}><span className="nx-swatch" style={{ background: seg.color }} />{seg.label}<b>{seg.value}</b></div>)}
    </div>
  </div>;
}

/* ---------- KPI card ---------- */
export function KpiCard({ label, value, delta, deltaType = 'flat', spark, tag }) {
  return <article className="nx-kpi">
    {tag && <span className="nx-kpi-tag">{tag}</span>}
    <span className="nx-kpi-label">{label}</span>
    <strong className="nx-kpi-value">{value}</strong>
    {delta && <span className={`nx-kpi-delta ${deltaType}`}>{delta}</span>}
    {spark && <Sparkline data={spark} color={deltaType === 'down' ? '#e5484d' : '#1f6feb'} />}
  </article>;
}

/* ---------- Filter chips ---------- */
export function FilterChips({ options, value, onChange }) {
  return <div className="nx-chips">
    {options.map(o => <button key={o.value} className={`nx-chip ${value === o.value ? 'active' : ''}`} onClick={() => onChange(o.value)}>{o.label}</button>)}
  </div>;
}

/* ---------- Live decision stream (real records only) ---------- */
const COLORS = { APPROVED: '#0f9d6b', REVIEW: '#c98a14', REJECTED: '#e5484d' };
export function LiveStream({ items = [] }) {
  if (!items.length) return <div className="nx-preview-empty">No decisions recorded yet. Run an analysis and it will appear here.</div>;
  return <div className="nx-stream">
    {items.map((it, i) => <div className="nx-stream-item" key={`${it.name}-${i}`}>
      <span className="nx-stream-dot" style={{ background: COLORS[it.decision] }} />
      <div><div className="nx-stream-name">{it.name}</div><div className="nx-stream-sub">{it.sub}</div></div>
      <div style={{ textAlign: 'right' }}>
        <span className={`nx-pill ${it.decision === 'APPROVED' ? 'pos' : it.decision === 'REJECTED' ? 'neg' : 'warn'}`}><i />{it.decision}</span>
        <div className="nx-stream-when">{i === 0 ? 'latest' : `#${items.length - i}`}</div>
      </div>
    </div>)}
  </div>;
}

/* ---------- Activity feed (audit ledger, real events) ---------- */
const TONE_ICON = {
  pos: IcDecisionTick,
  neg: IcDecisionCross,
  warn: IcReviewHourglass,
};
export function ActivityFeed({ items = [] }) {
  if (!items.length) return <div className="nx-preview-empty">No audit events yet. Decisions and reviews land here the moment they happen.</div>;
  return <div className="nx-activity">
    {items.slice(0, 7).map((it, i) => {
      const Icon = TONE_ICON[it.tone] || TONE_ICON.warn;
      return <div className="nx-activity-item" key={i}>
        <span className={`nx-activity-ic ${it.tone || 'ink'}`}><Icon /></span>
        <div><div className="nx-activity-main">{it.title}{it.sub && <span className="nx-activity-sub">{it.sub}</span>}</div><div className="nx-activity-time">{it.time}</div></div>
      </div>;
    })}
  </div>;
}

/* ---------- Proof type grid (evidence) ---------- */
export function ProofTypeGrid({ types, active, onSelect }) {
  return <div className="nx-proof-grid">
    {types.map(t => <button key={t.key} className={`nx-proof ${active === t.key ? 'active' : ''}`} onClick={() => onSelect(t.key)}>
      <span className="nx-proof-ic">{t.icon}</span>
      <span className="nx-proof-title">{t.title}</span>
    </button>)}
  </div>;
}

/* ---------- Trend area chart ---------- */
export function TrendChart({ data = [], height = 150, color = '#1f6feb' }) {
  if (!data.length) return null;
  const W = 1000, H = height, pad = 8;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const span = max - min || 1;
  const x = i => pad + (i / (data.length - 1)) * (W - pad * 2);
  const y = v => H - pad - ((v - min) / span) * (H - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  const gid = 'tg' + Math.round(color.charCodeAt(1) + data.length);
  return <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
    <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity="0.18" />
      <stop offset="100%" stopColor={color} stopOpacity="0" />
    </linearGradient></defs>
    {[0.25, 0.5, 0.75].map(t => <line key={t} x1={pad} x2={W - pad} y1={H * t} y2={H * t} stroke="#eef2f6" strokeWidth="1" />)}
    <path d={area} fill={`url(#${gid})`} />
    <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    {data.map((v, i) => i % Math.ceil(data.length / 6) === 0 && <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#fff" stroke={color} strokeWidth="2" />)}
  </svg>;
}

/* ---------- Review queue ---------- */
export function ReviewQueue({ cases = [], onReview, onOpen }) {
  const [pending, setPending] = useState(null); // { app, decision }
  const [note, setNote] = useState('');
  if (!cases.length) return <div className="nx-preview-empty">No cases awaiting review.</div>;
  const open = (app, decision) => { setPending({ app, decision }); setNote(''); };
  const confirm = () => {
    if (!note.trim()) return;
    onReview(pending.app, pending.decision, note.trim());
    setPending(null);
  };
  return <div className="nx-review">
    {cases.map(app => <div className="nx-review-item" key={app.id} onClick={() => onOpen && onOpen(app)} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
      <div><div className="nx-review-name">{app.applicantName}</div><div className="nx-review-meta">{app.confidenceScore}% confidence · {app.fraudRisk} fraud risk · {app.employmentType?.replaceAll('_', ' ')}</div></div>
      <div className="nx-review-actions" onClick={e => e.stopPropagation()}>
        <button className="nx-chip" style={{ background: '#0f9d6b', color: '#fff' }} onClick={() => open(app, 'APPROVED')}>Approve</button>
        <button className="nx-chip" style={{ background: '#e5484d', color: '#fff' }} onClick={() => open(app, 'REJECTED')}>Reject</button>
      </div>
    </div>)}
    <Modal
      title="Reviewer override · record your reason"
      open={Boolean(pending)}
      onCancel={() => setPending(null)}
      okText="Record decision"
      okButtonProps={{ disabled: !note.trim() }}
      onOk={confirm}
    >
      <p>Human-in-the-loop: your override and reason are written to the audit ledger. A reason is required.</p>
      <Typography.Text strong>{pending ? `${pending.app.applicantName} → ${pending.decision}` : ''}</Typography.Text>
      <Input.TextArea
        rows={3}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="State the override reason (e.g. approved on verified payslips; declined for undisclosed debt)…"
        status={note.trim() ? '' : 'error'}
      />
    </Modal>
  </div>;
}

/* ---------- Fintech tooltip (reused by chart components) ---------- */
function FintechTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e8eb',
      borderRadius: 8,
      padding: '8px 12px',
      boxShadow: '0 4px 12px rgba(0,0,0,.08)',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 12,
      lineHeight: '18px',
    }}>
      {label && <div style={{ color: '#8a97a6', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#0c1f33', fontWeight: 600 }}>{p.value?.toLocaleString?.() ?? p.value}</span>
          {p.name && <span style={{ color: '#8a97a6', marginLeft: 2 }}>{p.name}</span>}
        </div>
      ))}
    </div>
  );
}

/* ---------- Horizontal bar chart ---------- */
export function HorizontalBarChart({ data = [], height = 200, showLabels = true }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        barCategoryGap="20%"
      >
        <CartesianGrid horizontal={false} vertical={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#8a97a6', fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' }}
          width={showLabels ? 100 : 0}
        />
        <Tooltip content={<FintechTooltip />} cursor={false} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color || '#1f6feb'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Progress stat card ---------- */
export function ProgressStat({ label, value, maxValue, color = '#1f6feb', suffix }) {
  const pct = maxValue ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '12px 0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ color: '#8a97a6', fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ color: '#0c1f33', fontSize: 20, fontWeight: 700 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span style={{ fontSize: 13, fontWeight: 500, color: '#8a97a6', marginLeft: 3 }}>{suffix}</span>}
        </span>
      </div>
      <div style={{
        height: 6,
        borderRadius: 3,
        background: '#eef2f6',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 3,
          background: color,
          transition: 'width .4s ease',
        }} />
      </div>
      {maxValue && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#c1c8cf', fontSize: 11 }}>0</span>
          <span style={{ color: '#c1c8cf', fontSize: 11 }}>{maxValue.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Comparison bars (side-by-side horizontal) ---------- */
export function ComparisonBars({ data = [], height }) {
  if (!data.length) return null;
  const h = height || data.length * 50 + 20;
  const flat = data.map(d => ({
    label: d.label,
    [d.left.name || 'A']: d.left.value,
    [d.right.name || 'B']: d.right.value,
    _leftColor: d.left.color || '#1f6feb',
    _rightColor: d.right.color || '#e5484d',
    _leftName: d.left.name || 'A',
    _rightName: d.right.name || 'B',
  }));
  const leftName = data[0]?.left?.name || 'A';
  const rightName = data[0]?.right?.name || 'B';
  const leftColor = data[0]?.left?.color || '#1f6feb';
  const rightColor = data[0]?.right?.color || '#e5484d';

  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart
        data={flat}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        barCategoryGap="18%"
      >
        <CartesianGrid horizontal={false} vertical={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#8a97a6', fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' }}
          width={110}
        />
        <Tooltip content={<FintechTooltip />} cursor={false} />
        <Bar dataKey={leftName} fill={leftColor} radius={[0, 4, 4, 0]} barSize={10} />
        <Bar dataKey={rightName} fill={rightColor} radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Metric row (compact inline stat) ---------- */
export function MetricRow({ label, value, barPercent = 0, color = '#1f6feb', subtext }) {
  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '6px 0',
    }}>
      <span style={{ color: '#8a97a6', fontSize: 13, fontWeight: 500, minWidth: 100, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#0c1f33', fontSize: 18, fontWeight: 700, minWidth: 56, flexShrink: 0 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#eef2f6', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(Math.max(barPercent, 0), 100)}%`,
          borderRadius: 3,
          background: color,
          transition: 'width .4s ease',
        }} />
      </div>
      {subtext && <span style={{ color: '#c1c8cf', fontSize: 11, flexShrink: 0 }}>{subtext}</span>}
    </div>
  );
}
