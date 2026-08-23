import { useEffect, useState } from 'react';
import { Button, Layout, Typography } from 'antd';
import { ArrowRightOutlined, CheckCircleFilled, FileSearchOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { getAuditLogs, getCreditApplications, getIntegrations, getModelCard, login, reviewCreditApplication, searchEvidence, setAuthToken } from './Client';
import { FALLBACK_APPLICATIONS, FALLBACK_AUDIT_LOGS } from './seedData';
import { errorNotification } from './Notification';
import NxLogo from './icons/NxLogo';
import CreditApplicationForm from './CreditApplicationForm';
import WorkspacePages from './WorkspacePages';
import ApplicationDetail from './ApplicationDetail';
import CommandPalette from './CommandPalette';
import './App.css';
import './nexcredit-ui.css';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

/* Demo fixtures are opt-in only (REACT_APP_USE_FIXTURES=true). The workbench shows
   database truth by default; empty states render when the backend has no records. */
const USE_FIXTURES = process.env.REACT_APP_USE_FIXTURES === 'true';

function LandingPage({ onOpenWorkbench, onStartApplication }) {
  return <Layout className="app-shell landing-shell">
    <Header className="topbar"><div className="brand"><NxLogo variant="full" size={22} /></div><nav className="command-nav landing-nav"><Button type="text">Overview</Button><Button type="text" onClick={onOpenWorkbench}>Live workbench</Button></nav><Button className="new-app-button" onClick={onStartApplication}>Start an application <ArrowRightOutlined /></Button></Header>
    <Content className="landing-wrap">
      <section className="nx-hero">
        <div className="nx-hero-copy">
          <span className="nx-eyebrow">SYNCHRONY HACKATHON · PROBLEM STATEMENT 3</span>
          <h1>Credit decisions<br />with <em>context.</em></h1>
           <p>NexCredit helps New to Credit and thin file applicants across India get a fairer path forward. It combines consented Utility, Rent, Cash Flow and Digital signals with Tika extracted evidence, an agentic ops center and cashflow what if tools, and accountable human review instead of a missing score rejection.</p>
          <div className="nx-hero-actions">
            <Button className="nx-btn-primary" size="large" onClick={onOpenWorkbench}>Open live workbench <ArrowRightOutlined /></Button>
            <Button size="large" onClick={onStartApplication}>Run a sample application</Button>
          </div>
          <div className="nx-hero-trust"><CheckCircleFilled /> Explainable · <CheckCircleFilled /> Human review · <CheckCircleFilled /> Audit-ready</div>
        </div>
        <aside className="nx-hero-card">
          <div className="nx-card">
            <header className="nx-card-head"><h3>Sample decision</h3><span className="nx-sub">New-to-Credit profile</span></header>
            <div className="nx-card-body">
              <div className="nx-preview-name">Aarav Mehta</div>
              <div className="nx-preview-meta">Gig worker · ₹2.4L / yr</div>
              <span className="nx-pill warn"><i />Routed to review</span>
              <div style={{ height: 14 }} />
              <div className="nx-sample-signals">
                {[['Mobile', 72], ['Transactions', 64], ['Social', 58]].map(([l, v]) => <div key={l} className="nx-sample-signal"><span>{l}</span><div className="nx-meter"><i style={{ width: v + '%' }} /></div><b>{v}</b></div>)}
              </div>
              <div style={{ height: 10 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>Confidence 92% · fraud risk LOW</Text>
            </div>
          </div>
        </aside>
      </section>

      <section className="nx-problem">
        <div><span className="nx-eyebrow">THE PROBLEM</span><h2>Thin-file applicants deserve more than a missing-score rejection.</h2></div>
        <p>Traditional bureau models often have no data on young earners, gig workers, and first-time applicants. NexCredit makes the decision path visible, uses consented prototype signals, and refers uncertain cases to a human underwriter rather than guessing.</p>
      </section>

      <section className="nx-cap-grid">
        <article className="nx-card"><h3>Composite underwriting</h3><p>Bureau + utility, rent, cash flow and digital signals in one NTC-aware profile.</p></article>
        <article className="nx-card"><h3>Governed AI</h3><p>Logistic model with fallbacks, policy guardrails and human review for under-21 and mismatch cases.</p></article>
        <article className="nx-card"><h3>Evidence that explains</h3><p>Tika-extracted fields, pgvector search and a full audit ledger for every decision.</p></article>
      </section>

      <section className="nx-step-flow-wrap">
        <span className="nx-eyebrow">HOW IT WORKS</span>
        <h2>From signal to accountable action.</h2>
        <div className="nx-step-flow">
          {[['1', 'Consent-led intake', '4 consented signals (mobile, transaction, social plus bank) and document uploads via Tika.'],
            ['2', 'Decisioning API', 'Spring Boot logistic model with rule fallback and confidence plus fraud label.'],
            ['3', 'Guardrails & review', 'Guardrails require confidence ≥70% and fraud ≤MEDIUM and DTI ≤30%, and every under-21 case is reviewed.'],
            ['4', 'Evidence & accountability', 'PostgreSQL + pgvector ledger keeps decision, audit trail and searchable evidence.']].map(([n, t, d]) => <div className="nx-step" key={n}><span className="nx-step-n">{n}</span><h4>{t}</h4><p>{d}</p></div>)}
        </div>
      </section>

      <section className="nx-cta-band">
        <div><h2>See the full underwriting workflow.</h2><p>Open the portfolio, review a case, and watch the audit trail update.</p></div>
        <Button size="large" onClick={onOpenWorkbench}>Explore NexCredit <ArrowRightOutlined /></Button>
      </section>
    </Content>
    <Footer className="footer">NexCredit AI · Synchrony Hackathon 2026</Footer>
  </Layout>;
}

function App() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeNavigation, setActiveNavigation] = useState('Command Center');
  const [detailApp, setDetailApp] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    // DEMO-ONLY: auto-login with the seeded underwriter account so the workbench
    // is usable without a manual sign-in during the hackathon demo. Not for production.
    // Data loads are chained after auth so no request fires without a JWT.
    login('underwriter', 'underwriter123')
      .then(response => { setAuthToken(response.token); loadApplications(); loadAuditLogs(); loadSystemStatus(); })
      .catch(() => { loadApplications(); loadAuditLogs(); });
  }, []);
  const loadApplications = () => {
    setLoading(true);
    return getCreditApplications().then(response => response.json()).then(setApplications)
      .catch(() => { setApplications(USE_FIXTURES ? FALLBACK_APPLICATIONS : []); })
      .finally(() => setLoading(false));
  };
  const loadAuditLogs = () => getAuditLogs().then(response => response.json()).then(setAuditLogs).catch(() => setAuditLogs(USE_FIXTURES ? FALLBACK_AUDIT_LOGS : []));
  const [modelInfo, setModelInfo] = useState(null);
  const [integrationInfo, setIntegrationInfo] = useState(null);
  const [vectorOn, setVectorOn] = useState(null);
  const loadSystemStatus = () => {
    getModelCard().then(setModelInfo).catch(() => setModelInfo(null));
    getIntegrations().then(setIntegrationInfo).catch(() => setIntegrationInfo(null));
    searchEvidence('', 1).then(r => setVectorOn(!!(r && r.semanticSearchAvailable))).catch(() => setVectorOn(false));
  };
  const approved = applications.filter(app => app.creditDecision === 'APPROVED').length;
  const pending = applications.filter(app => app.reviewStatus === 'PENDING_REVIEW').length;
  const completeReview = (application, decision) => reviewCreditApplication(application.id, decision, `Reviewer finalised ${decision.toLowerCase()} in the NexCredit workbench.`)
    .then(() => { loadApplications(); loadAuditLogs(); })
    .catch(() => errorNotification('Review could not be saved', 'Confirm that the backend is running and try again.'));
  const startApplication = () => { setWorkspaceOpen(true); setDrawerOpen(true); };
  const navigateTo = label => {
    setActiveNavigation(label);
  };
  if (!workspaceOpen) return <><LandingPage onOpenWorkbench={() => setWorkspaceOpen(true)} onStartApplication={startApplication} /><CreditApplicationForm open={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={loadApplications} /></>;
    return <Layout className="app-shell">
        <Header className="topbar workspace-topbar"><div className="workspace-brand"><Button type="text" className="brand brand-home" onClick={() => { setWorkspaceOpen(false); setActiveNavigation('Command Center'); }}><NxLogo variant="full" size={20} /></Button><span className="product-context">CREDIT OPERATIONS</span></div>
          <div className="workspace-status">
            <span className="nx-chip-stat"><b>{applications.length}</b> cases</span>
            <span className={`nx-chip-stat ${modelInfo ? 'on' : ''}`}>{modelInfo ? `ML live · AUC ${Number(modelInfo.evaluation?.auc || 0).toFixed(2)}` : 'ML status…'}</span>
            <span className={`nx-chip-stat ${vectorOn === null ? '' : vectorOn ? 'on' : 'off'}`}>{vectorOn === null ? 'vector…' : vectorOn ? 'pgvector ON' : 'pgvector OFF'}</span>
            <span className={`nx-chip-stat ${integrationInfo ? (Object.values(integrationInfo).filter(v => v.connected).length ? 'on' : 'off') : ''}`}>{integrationInfo ? `${Object.values(integrationInfo).filter(v => v.connected).length}/${Object.keys(integrationInfo).length} sources` : 'sources…'}</span>
          </div>
        <div className="workspace-controls"><Button className="command-search" onClick={() => setPaletteOpen(true)}><FileSearchOutlined /> Search <kbd>⌘K</kbd></Button></div></Header>
    <Content className="content-wrap">
      <WorkspacePages activePage={activeNavigation} applications={applications} auditLogs={auditLogs} loading={loading} approved={approved} pending={pending} onOpenApplication={() => setDrawerOpen(true)} onOpenDetail={setDetailApp} onRefresh={loadApplications} onRefreshAudit={loadAuditLogs} onReview={completeReview} onNavigate={navigateTo} />
    </Content>
    <Footer className="footer">NexCredit AI · Synchrony Hackathon 2026</Footer>
    <CreditApplicationForm open={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={loadApplications} />
    <ApplicationDetail application={detailApp} auditLogs={auditLogs} onClose={() => setDetailApp(null)} />
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} applications={applications} onNavigate={label => { setActiveNavigation(label); }} onOpenDetail={app => setDetailApp(app)} />
  </Layout>;
}
export default App;
