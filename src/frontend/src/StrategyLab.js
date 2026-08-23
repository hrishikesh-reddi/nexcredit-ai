import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Input, InputNumber, Progress, Select, Slider, Spin, Tag, Typography } from 'antd';
import { askCopilot, getModelCard, simulateProfile } from './Client';
import { IcDecisionTick, IcShieldAudit, IcPulse } from './icons/NxIcons';

const { Text } = Typography;

const decisionTone = d => d === 'APPROVED' ? 'pos' : d === 'REJECTED' ? 'neg' : 'warn';
const prettyFeature = k => ({ mobile: 'Mobile usage', transaction: 'Transaction behaviour', social: 'Social signal', monthlyIncome: 'Monthly income', emiBurden: 'EMI burden', creditToIncome: 'Credit to income', dependents: 'Dependents', employmentYears: 'Employment years', educationScore: 'Education', incomeTypeScore: 'Income type', revolvingLoan: 'Revolving loan', income: 'Income stability', employment: 'Employment type' }[k] || k);

function WhatIfLab({ applications = [] }) {
  const [baselineApp, setBaselineApp] = useState(null);
  const defaultProfile = { applicantName: 'Scenario profile', age: 24, employmentType: 'GIG_WORKER', annualIncome: 240000, mobileUsageScore: 72, transactionBehaviorScore: 64, socialSignalScore: 58 };
  const [profile, setProfile] = useState(defaultProfile);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [pathToApproval, setPathToApproval] = useState([]);
  const requestId = useRef(0);

  const PATH_ATTEMPTS = [
    ['Mobile usage +20', p => ({ ...p, mobileUsageScore: Math.min(100, p.mobileUsageScore + 20) })],
    ['Transactions +20', p => ({ ...p, transactionBehaviorScore: Math.min(100, p.transactionBehaviorScore + 20) })],
    ['Social signal +20', p => ({ ...p, socialSignalScore: Math.min(100, p.socialSignalScore + 20) })],
    ['Income +50%', p => ({ ...p, annualIncome: Math.round(p.annualIncome * 1.5) })],
    ['All signals +15', p => ({ ...p, mobileUsageScore: Math.min(100, p.mobileUsageScore + 15), transactionBehaviorScore: Math.min(100, p.transactionBehaviorScore + 15), socialSignalScore: Math.min(100, p.socialSignalScore + 15) })],
  ];

  const run = async (p = profile) => {
    const id = ++requestId.current;
    setRunning(true);
    setPathToApproval([]);
    try {
      const simulated = await simulateProfile(p);
      if (id !== requestId.current) return;
      setResult(simulated);
      if (simulated.creditDecision !== 'APPROVED') {
        const attempts = await Promise.all(PATH_ATTEMPTS.map(async ([label, mutate]) => {
          try {
            const flipped = await simulateProfile(mutate(p));
            return { label, decision: flipped.creditDecision, confidence: flipped.confidenceScore, apply: mutate };
          } catch (e) {
            return null;
          }
        }));
        if (id !== requestId.current) return;
        const valid = attempts.filter(Boolean);
        setPathToApproval({
          flips: valid.filter(attempt => attempt.decision === 'APPROVED'),
          closest: valid.slice().sort((a, b) => b.confidence - a.confidence)[0],
        });
      }
    } catch (e) {
      if (id === requestId.current) setResult(null);
    } finally {
      if (id === requestId.current) setRunning(false);
    }
  };

  // Live mode: re-run automatically as sliders move (debounced).
  useEffect(() => {
    const timer = setTimeout(() => run(profile), 450);
    return () => clearTimeout(timer);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCase = appId => {
    const app = applications.find(a => String(a.id) === String(appId));
    if (!app) { setBaselineApp(null); setProfile(defaultProfile); return; }
    setBaselineApp(app);
    setProfile({
      applicantName: app.applicantName,
      age: app.age,
      employmentType: app.employmentType,
      annualIncome: Number(app.annualIncome) || 0,
      mobileUsageScore: Number(app.mobileUsageScore) || 50,
      transactionBehaviorScore: Number(app.transactionBehaviorScore) || 50,
      socialSignalScore: Number(app.socialSignalScore) || 50,
    });
  };

  const update = (key, value) => setProfile(previous => ({ ...previous, [key]: value }));
  const maxContribution = result?.modelContributions ? Math.max(...Object.values(result.modelContributions).map(Math.abs), 0.001) : 1;

  const baselineChanged = baselineApp && result && (
    result.creditDecision !== (baselineApp.creditDecision === 'PENDING' ? 'REVIEW' : baselineApp.creditDecision) ||
    result.confidenceScore !== baselineApp.confidenceScore);

  return <div style={{ display: 'grid', gap: 18 }}>
    {baselineApp && (
      <section className="nx-card">
        <header className="nx-card-head"><h3>Case baseline</h3><span className="nx-sub">comparing your levers against a real application in the portfolio</span></header>
        <div className="nx-card-body nx-casebar">
          <div className="nx-case-col">
            <span className="nx-kpi-label">Portfolio record #{baselineApp.id}</span>
            <b>{baselineApp.applicantName}</b>
            <span className={`nx-pill ${decisionTone(baselineApp.creditDecision === 'PENDING' ? 'REVIEW' : baselineApp.creditDecision)}`}><i />{baselineApp.creditDecision === 'PENDING' ? 'REVIEW' : baselineApp.creditDecision} · {baselineApp.confidenceScore}%</span>
          </div>
          <IcPulse width={18} height={18} style={{ color: '#8a97a6' }} />
          <div className="nx-case-col">
            <span className="nx-kpi-label">Current lever position</span>
            <b>{result ? `${result.creditDecision} · ${result.confidenceScore}%` : 'scoring…'}</b>
            <span className="nx-sub">{baselineChanged ? 'changed by your adjustments · nothing saved' : 'matches the stored decision'}</span>
          </div>
        </div>
      </section>
    )}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <section className="nx-card">
        <header className="nx-card-head">
          <h3><IcPulse width={16} height={16} /> Decision levers</h3>
          <span className="nx-sub">{running ? <Tag color="processing" style={{ margin: 0 }}>scoring…</Tag> : <span style={{ color: 'var(--nx-muted)', fontSize: 11 }}>{applications.length ? 'pick a case or move any slider' : 'adjust to simulate'}</span>}</span>
        </header>
        <div className="nx-card-body" style={{ display: 'grid', gap: 14 }}>
          <div>
            <div className="nx-kpi-label" style={{ marginBottom: 6 }}>Start from a live case in the portfolio</div>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder={applications.length ? 'Pick an applicant to load their signals' : 'No applications yet'}
              value={baselineApp ? String(baselineApp.id) : undefined}
              onChange={loadCase}
              options={applications.map(a => ({ value: String(a.id), label: `#${a.id} ${a.applicantName} · ${(a.employmentType || '').replaceAll('_', ' ')} · ${a.creditDecision === 'PENDING' ? 'REVIEW' : a.creditDecision}` }))}
            />
          </div>
          {[['Mobile usage', 'mobileUsageScore'], ['Transaction behaviour', 'transactionBehaviorScore'], ['Social signal', 'socialSignalScore']].map(([label, key]) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="nx-kpi-label">{label}</span><b>{profile[key]}</b></div>
              <Slider min={0} max={100} value={profile[key]} onChange={value => update(key, value)} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="nx-kpi-label" style={{ marginBottom: 6 }}>Annual income (₹)</div>
              <InputNumber min={0} step={25000} style={{ width: '100%' }} value={profile.annualIncome} onChange={value => update('annualIncome', value || 0)} />
            </div>
            <div>
              <div className="nx-kpi-label" style={{ marginBottom: 6 }}>Employment</div>
              <Select style={{ width: '100%' }} value={profile.employmentType} onChange={value => update('employmentType', value)}
                options={['SALARIED', 'SELF_EMPLOYED', 'GIG_WORKER', 'STUDENT'].map(value => ({ value, label: value.replace('_', ' ') }))} />
            </div>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>The engine re-scores on every change using the same trained model that decides real applications.</Text>
        </div>
      </section>
      <section className="nx-card">
        <header className="nx-card-head"><h3><IcDecisionTick width={16} height={16} /> Projected outcome</h3>{result && <span className="nx-sub">{result.mlPowered ? 'ML scored' : 'rule-based'} · {result.decisionLatencyMs} ms</span>}</header>
        <div className="nx-card-body" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          {!result && <Text type="secondary">Move any lever and the engine responds instantly.</Text>}
          {result && <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={`nx-pill ${decisionTone(result.creditDecision)}`}><i />{result.creditDecision}</span>
              <Progress percent={result.confidenceScore} strokeColor="#1f6feb" style={{ flex: 1, margin: 0 }} />
              <b>{result.confidenceScore}%</b>
            </div>
            {result.recommendedCreditLimit != null && <div>Recommended limit: <b>₹{Number(result.recommendedCreditLimit).toLocaleString('en-IN')}</b></div>}
            {result.adverseReasonCodes?.length > 0 && <div>{result.adverseReasonCodes.map(code => <Tag key={code} color="volcano" style={{ marginBottom: 4 }}>{code}</Tag>)}</div>}
            {pathToApproval?.flips?.length > 0 && (
              <div className="nx-note-panel pos">
                <div className="nx-kpi-label" style={{ marginBottom: 8, color: '#15803d' }}>Path to approval — click one to apply it to the sliders:</div>
                {pathToApproval.flips.map(flippedAttempt => (
                  <div key={flippedAttempt.label} style={{ fontSize: 13, marginBottom: 4 }}>
                    <Button size="small" type="dashed" onClick={() => flippedAttempt.apply && setProfile(flippedAttempt.apply(profile))}>
                      <IcDecisionTick width={13} height={13} style={{ color: '#16a34a' }} /> {flippedAttempt.label} → APPROVED at {flippedAttempt.confidence}%
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {pathToApproval && pathToApproval.flips?.length === 0 && pathToApproval.closest && (
              <div className="nx-note-panel warn">
                <div className="nx-kpi-label" style={{ marginBottom: 6, color: '#92400e' }}>No single lever reaches approval. Closest single change:</div>
                <b>{pathToApproval.closest.label}</b> → still {pathToApproval.closest.decision}, but confidence rises to {pathToApproval.closest.confidence}%
              </div>
            )}
            <div>
              <div className="nx-kpi-label" style={{ marginBottom: 8 }}>Model drivers for this profile</div>
              {Object.entries(result.modelContributions || {}).map(([feature, value]) => (
                <div key={feature} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><span>{prettyFeature(feature)}</span><span>{value >= 0 ? 'supports approval' : 'against approval'}</span></div>
                  <Progress percent={Math.round((Math.abs(value) / maxContribution) * 100)} showInfo={false} strokeColor={value >= 0 ? '#0f9d6b' : '#e5484d'} />
                </div>
              ))}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>{result.reasoning}</Text>
            <div style={{ background: '#f8fafc', border: '1px solid var(--nx-line)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: 11, lineHeight: 1.6 }}>
              <div style={{ color: 'var(--nx-muted)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>▸ inference trace</span><span style={{ background: result.mlPowered ? '#ecfdf5' : '#fef3c7', color: result.mlPowered ? '#065f46' : '#92400e', padding: '1px 8px', borderRadius: 999, border: `1px solid ${result.mlPowered ? '#a7f3d0' : '#fde68a'}`, fontSize: 10 }}>{result.mlPowered ? 'logistic-regression · live' : 'rule fallback'}</span></div>
              <div style={{ color: 'var(--nx-ink)' }}>scored <b>{profile.applicantName}</b> → <b style={{ color: result.creditDecision === 'APPROVED' ? '#0f9d6b' : result.creditDecision === 'REJECTED' ? '#e5484d' : '#c98a14' }}>{result.creditDecision}</b> in {result.decisionLatencyMs}ms</div>
              <div style={{ color: 'var(--nx-body)', marginTop: 2 }}>mobile {profile.mobileUsageScore} · tx {profile.transactionBehaviorScore} · social {profile.socialSignalScore} · income ₹{Number(profile.annualIncome).toLocaleString('en-IN')} · {profile.employmentType.replaceAll('_', ' ')}</div>
            </div>
          </>}
        </div>
      </section>
    </div>
  </div>;
}

function ModelTransparencyCard() {
  const [card, setCard] = useState(null);
  useEffect(() => { getModelCard().then(setCard).catch(() => {}); }, []);
  if (!card) return null;
  const weights = Object.entries(card.featureWeights || {});
  const maxWeight = Math.max(...weights.map(([, meta]) => Math.abs(meta.weightOnDefaultRisk ?? meta.weight ?? 0)), 0.001);
  const evalM = card.evaluation || {};
  const bench = card.benchmarkVsRule || {};
  const confusion = evalM.confusion || null;
  return <section className="nx-card">
    <header className="nx-card-head">
      <h3><IcShieldAudit width={16} height={16} /> Model transparency</h3>
      <span className="nx-sub">live from the running model · holdout never used in training</span>
    </header>
    <div className="nx-card-body" style={{ display: 'grid', gap: 18, gridTemplateColumns: '1.2fr 1fr' }}>
      <div>
        <div className="nx-kpi-label" style={{ marginBottom: 10 }}>Feature contribution — horizontal</div>
          {weights.map(([feature, meta]) => {
            const w = meta.weightOnDefaultRisk ?? meta.weight ?? 0;
            const pct = Math.round((Math.abs(w) / maxWeight) * 100);
            return (
              <div key={feature} style={{ marginBottom: 8 }}>
                <span className="nx-kpi-label" style={{ marginBottom: 4 }}>{prettyFeature(feature)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 8, background: 'var(--nx-surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: w >= 0 ? 'var(--nx-pos)' : 'var(--nx-neg)', borderRadius: 999 }} />
                  </div>
                  <b style={{ fontSize: 12, minWidth: 36, textAlign: 'right' }}>{w >= 0 ? '+' : ''}{w}</b>
                </div>
              </div>
            );
          })}
        <Text type="secondary" style={{ fontSize: 12 }}>Bias term: {card.biasTerm}. Positive weight pushes default risk up; approval uses its complement.</Text>
        {evalM.auc != null && (
            <div className="nx-holdout-panel">
              <div className="nx-holdout-head">
                <span className="nx-kpi-label">Holdout evaluation · {evalM.holdoutSize} unseen applications</span>
                <span className="nx-holdout-auc">AUC {evalM.auc}</span>
              </div>
              <div className="nx-metric-grid">
                {[['Accuracy', evalM.accuracy], ['Precision', evalM.precision], ['Recall', evalM.recall], ['F1', evalM.f1]].map(([label, value]) => (
                  <div className="nx-metric" key={label}>
                    <span className="nx-metric-v">{value}</span>
                    <span className="nx-metric-l">{label}</span>
                  </div>
                ))}
              </div>
              {confusion && (
                <div className="nx-confusion">
                  {[['Correct repayers', confusion.tn, 'pos'], ['Defaulters caught', confusion.tp, 'pos'], ['Good applicants declined', confusion.fp, 'neg'], ['Defaulters missed', confusion.fn, 'neg']].map(([label, v, tone]) => (
                    <span key={label} className={`nx-confusion-cell ${tone}`}>{v} <em>{label}</em></span>
                  ))}
                </div>
              )}
              <div className="nx-holdout-note">{evalM.note}</div>
            </div>
        )}
      </div>
      <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
        {[['Algorithm', card.algorithm], ['Holdout size', evalM.holdoutSize], ['Iterations', card.iterations],
          ['Learning rate', card.learningRate], ['L2 regularisation', card.l2Regularisation], ['Status', card.available ? 'Trained & serving' : 'Fallback active']].filter(([, v]) => v != null).map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #eef0f3', paddingBottom: 6 }}>
            <span className="nx-kpi-label">{label}</span><b>{String(value)}</b>
          </div>
        ))}
        {bench.liftVsRule != null && (
          <div className="nx-note-panel ink" style={{ fontSize: 12 }}>
            <div className="nx-kpi-label" style={{ marginBottom: 4 }}>ML vs deterministic rule · same holdout</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ML approvals</span><b>{bench.mlApprovals} ({Math.round((bench.mlApprovalRate || 0) * 100)}%)</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Rule approvals</span><b>{bench.ruleApprovals} ({Math.round((bench.ruleApprovalRate || 0) * 100)}%)</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span>Lift</span><b style={{ color: bench.liftVsRule > 0 ? '#0f9d6b' : '#e5484d' }}>{bench.liftVsRule > 0 ? '+' : ''}{Math.round(bench.liftVsRule * 100)}%</b></div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>{bench.note}</div>
          </div>
        )}
        <div className="nx-note-panel soft">
          <IcShieldAudit width={14} height={14} style={{ color: '#0f9d6b', flexShrink: 0 }} /> <span style={{ fontSize: 12 }}>{card.fairnessNote}</span>
        </div>
      </div>
    </div>
  </section>;
}

export function FairnessMonitor({ applications }) {
  const byType = useMemo(() => {
    const groups = {};
    applications.forEach(app => {
      const key = app.employmentType || 'UNKNOWN';
      groups[key] = groups[key] || { total: 0, approved: 0 };
      groups[key].total += 1;
      if ((app.creditDecision || '') === 'APPROVED') groups[key].approved += 1;
    });
    return Object.entries(groups)
      .map(([type, stats]) => ({ type: type.replaceAll('_', ' '), ...stats, rate: Math.round((stats.approved / stats.total) * 100) }))
      .sort((a, b) => b.total - a.total);
  }, [applications]);

  /* Four-fifths parity check across cohorts with at least one decision. */
  const rates = byType.filter(r => r.rate != null).map(r => r.rate);
  const minRate = rates.length ? Math.min(...rates) : null;
  const maxRate = rates.length ? Math.max(...rates) : null;
  const parityOk = minRate == null || minRate === 0 ? true : (minRate / maxRate) >= 0.8;

  const parityThreshold = maxRate != null ? Math.round(maxRate * 0.8) : 80;

  return <section className="nx-card">
    <header className="nx-card-head">
      <h3><IcShieldAudit width={16} height={16} /> Fair lending monitor</h3>
      <span className={`nx-parity-badge ${parityOk ? 'ok' : 'flagged'}`}>
        <IcDecisionTick width={13} height={13} /> {parityOk ? 'within 4/5ths' : 'review needed'}
      </span>
    </header>
    <div className="nx-card-body" style={{ display: 'grid', gap: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--nx-muted)' }}>approval rate by employment cohort · computed from the live portfolio · 4/5ths line at {parityThreshold}%</div>
      {byType.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="nx-sub">Run applications to populate fairness metrics</span>} style={{ padding: '12px 0' }} />}
      {byType.length > 0 && (
        <>
          {/* Scientific parity spectrum — cohorts as dots on a 0-100 scale */}
          <div style={{ background: '#f8fafc', border: '1px solid #eef2f6', borderRadius: 10, padding: '16px 14px 10px' }}>
            <div style={{ position: 'relative', height: 92, marginBottom: 4 }}>
              {/* track */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 32, height: 6, background: '#eef2f6', borderRadius: 999 }} />
              {/* parity band */}
              {maxRate != null && (
                <div style={{ position: 'absolute', left: `${(parityThreshold / 100) * 100}%`, right: 0, top: 32, height: 6, background: parityOk ? '#dcfce7' : '#fef3c7', borderRadius: '0 999px 999px 0', opacity: 0.9 }} />
              )}
              {/* threshold tick */}
              <div style={{ position: 'absolute', left: `${parityThreshold}%`, top: 24, bottom: 28, width: 1, background: '#c98a14', borderLeft: '1px dashed #c98a14' }} />
              <span style={{ position: 'absolute', left: `${parityThreshold}%`, top: 2, transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: 999, whiteSpace: 'nowrap' }}>4/5ths · {parityThreshold}%</span>
              {/* cohort dots — vertically staggered when same rate */}
              {byType.map(row => {
                const sameRate = byType.filter(r => r.rate === row.rate);
                const posInGroup = sameRate.findIndex(r => r.type === row.type);
                const groupSize = sameRate.length;
                const offsetY = groupSize > 1 ? posInGroup * 18 - ((groupSize - 1) * 9) : 0;
                return (
                  <div key={row.type} style={{ position: 'absolute', left: `${row.rate}%`, top: 22 + offsetY, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: row.rate < parityThreshold ? '#e5484d' : row.rate > 85 ? '#0f9d6b' : '#1f6feb', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.15)' }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--nx-ink)', whiteSpace: 'nowrap' }}>{row.rate}%</span>
                    <span style={{ fontSize: 9, color: 'var(--nx-muted)', whiteSpace: 'nowrap', maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.type}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#b8c4d1', marginTop: 2 }}><span>0%</span><span>50%</span><span>100%</span></div>
          </div>

          {/* Compact cohort table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0, border: '1px solid #eef2f6', borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
            <div style={{ background: '#f8fafc', padding: '7px 10px', fontWeight: 700, color: 'var(--nx-muted)', fontSize: 11, borderBottom: '1px solid #eef2f6' }}>Cohort</div>
            <div style={{ background: '#f8fafc', padding: '7px 10px', fontWeight: 700, color: 'var(--nx-muted)', fontSize: 11, textAlign: 'right', borderBottom: '1px solid #eef2f6' }}>n</div>
            <div style={{ background: '#f8fafc', padding: '7px 10px', fontWeight: 700, color: 'var(--nx-muted)', fontSize: 11, textAlign: 'right', borderBottom: '1px solid #eef2f6' }}>Approval</div>
            {byType.map(row => (
              <div key={row.type} style={{ display: 'contents' }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: row.rate < parityThreshold ? '#e5484d' : '#0f9d6b', flexShrink: 0 }} />
                  {row.type}
                </div>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: 'var(--nx-body)' }}>{row.approved}/{row.total}</div>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700, color: row.rate < parityThreshold ? '#b42318' : 'var(--nx-ink)' }}>{row.rate}%</div>
              </div>
            ))}
          </div>
        </>
      )}
      <Text type="secondary" style={{ fontSize: 12 }}>Gaps are surfaced deliberately. Under-21 rejections always route to human review.</Text>
    </div>
  </section>;
}

function AgentConsole({ applications = [] }) {
  const selectedAppId = applications[0]?.id ?? null;
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async q => {
    const text = (q ?? question).trim();
    if (!text || loading) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setQuestion('');
    setLoading(true);
    try {
      const response = await askCopilot(selectedAppId, text);
      setMessages(prev => [...prev, { role: 'agent', text: response.answer, tools: response.toolCalls || [] }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'agent', text: 'The copilot could not answer right now. Confirm the backend is running and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return <section className="nx-card" style={{ marginBottom: 18 }}>
    <header className="nx-card-head">
      <h3>AI Operations Center — Agent Console</h3>
      <span className="nx-sub">Live underwriting copilot — ask it to re-underwrite, explain, or challenge a decision · Workspace synced</span>
    </header>
    <div className="nx-card-body" style={{ display: 'grid', gap: 12 }}>
      {selectedAppId == null
        ? <Tag color="default" style={{ margin: 0 }}>No application in context — answering from general policy</Tag>
        : <Tag color="blue" style={{ margin: 0 }}>Context: application #{selectedAppId}</Tag>}
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'grid', gap: 8, alignContent: 'start' }}>
        {messages.length === 0 && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Ask the agent to re-underwrite a case, explain a decision, or challenge the model.</Typography.Text>}
        {messages.map((m, i) => m.role === 'user'
          ? <div key={i} style={{ textAlign: 'right' }}><span style={{ background: 'var(--nx-accent)', color: '#fff', padding: '6px 12px', borderRadius: 12, display: 'inline-block', fontSize: 13 }}>{m.text}</span></div>
          : <div key={i}>
              <div style={{ background: 'var(--nx-surface-2)', border: '1px solid var(--nx-line)', padding: '8px 12px', borderRadius: 10, fontSize: 13 }}>{m.text}</div>
              {m.tools?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {m.tools.map((t, ti) => <span key={ti} className="nx-corpus-chip">tool: {t.name || t}</span>)}
                </div>
              )}
            </div>)}
        {loading && <div style={{ fontSize: 12, color: 'var(--nx-muted)' }}><Spin size="small" /> thinking…</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input value={question} onChange={e => setQuestion(e.target.value)} onPressEnter={() => ask()} placeholder="Re-underwrite on fraud signals, or explain the last rejection…" disabled={loading} />
        <Button type="primary" onClick={() => ask()} loading={loading}>Ask</Button>
      </div>
    </div>
  </section>;
}

export default function StrategyLab({ applications = [] }) {
  return <div>
    <header className="nx-pagehead">
      <div>
        <h1>Strategy Lab</h1>
        <p>Work a real case from the portfolio and see how each lever moves the trained engine. Full model introspection and cohort fairness on the same surface.</p>
      </div>
    </header>
    <AgentConsole applications={applications} />
    <WhatIfLab applications={applications} />
    <div style={{ height: 18 }} />
    <ModelTransparencyCard />
    <div style={{ height: 18 }} />
    <FairnessMonitor applications={applications} />
  </div>;
}
