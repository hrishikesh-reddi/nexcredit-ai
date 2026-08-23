import { CheckCircleFilled, LoadingOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

const agents = [
  ['Consent & Intake', 'Validating applicant profile and consent scope'],
  ['Evidence Extraction', 'Parsing supporting documents via Tika + vector index'],
  ['Fraud / Velocity', 'Screening behavioral risk and income divergence'],
  ['Risk Scoring', 'Logistic-regression inference with feature attribution'],
  ['Explanation (LLM)', 'Grounded rationale via guarded LLM or deterministic engine'],
  ['Escalation / Human gate', 'Applying policy thresholds and bias guardrails for human review'],
];

function normalizeSources(sources) {
  if (!sources) return [];
  let arr = sources;
  if (typeof sources === 'string') {
    try { arr = JSON.parse(sources); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => {
    if (typeof s === 'string') return s;
    if (s && typeof s === 'object') return Object.values(s).filter((v) => typeof v === 'string').join(' ');
    return String(s);
  });
}

function AgentPipeline({ activeStep = -1, complete = false, decision }) {
  if (activeStep < 0 && !complete && !decision) return null;
  const hasDecision = Boolean(decision);
  const sources = hasDecision ? normalizeSources(decision.dataPullSources) : [];
  const hasRetrieval = sources.some((s) => /vector|search|retrieval/i.test(s));
  return <section className="agent-pipeline" aria-label="Underwriting decision pipeline">
    <div className="section-kicker">MULTI-AGENT TRACE</div>
    <h3>Agentic underwriting pipeline</h3>
    <p>Six named agents execute every application in sequence; each tool call, threshold and hand-off is written to the audit trail.</p>
    {agents.map(([title, description], index) => {
      const done = hasDecision || complete || index < activeStep;
      const running = !hasDecision && !complete && index === activeStep;
      return <div className={`pipeline-step ${done ? 'done' : ''} ${running ? 'running' : ''}`} key={title}>
        <span className="pipeline-icon">{done ? <CheckCircleFilled /> : running ? <LoadingOutlined spin /> : index + 1}</span>
        <div><strong>{title}</strong><small>{done ? 'Complete' : running ? `${description}…` : 'Waiting'}</small></div>
        {done && index === 1 && hasRetrieval && <Tag color="geekblue">retrieval</Tag>}
        {done && index === 2 && decision?.fraudRisk && <Tag color={decision.fraudRisk === 'HIGH' ? 'red' : decision.fraudRisk === 'LOW' ? 'green' : 'gold'}>{decision.fraudRisk} fraud</Tag>}
        {done && index === 3 && <Tag color="blue">{decision?.modelVersion || 'logreg-hybrid-v3'}</Tag>}
        {done && index === 4 && <Tag color={decision?.aiPowered ? 'purple' : 'default'}>{decision?.aiPowered ? 'Groq llama-3.3' : 'rule-based'}</Tag>}
        {done && index === 5 && decision?.creditDecision && <Tag color={decision.creditDecision === 'APPROVED' ? 'green' : decision.creditDecision === 'REJECTED' ? 'red' : 'gold'}>{decision.creditDecision === 'PENDING' ? 'ESCALATED' : decision.creditDecision}</Tag>}
      </div>;
    })}
    {hasDecision && typeof decision.decisionLatencyMs === 'number' && (
      <div className="pipeline-latency" style={{ fontVariantNumeric: 'tabular-nums', marginTop: 8, color: '#667', fontSize: 13 }}>
        Decided in {decision.decisionLatencyMs} ms · {sources.length} data sources pulled
      </div>
    )}
  </section>;
}

export default AgentPipeline;
