import { Drawer, Empty, Tag, Timeline, Typography, Progress, List, Space, Alert } from 'antd';
import { FileSearchOutlined, SafetyCertificateOutlined, ThunderboltOutlined, ApartmentOutlined, PartitionOutlined } from '@ant-design/icons';
import DecisionCard from './DecisionCard';
import AgentPipeline from './AgentPipeline';
import RiskRadar from './RiskRadar';
import FraudHeatmap from './FraudHeatmap';
import TraditionalComparison from './TraditionalComparison';

const { Paragraph, Text } = Typography;

const tagColor = decision => ({ APPROVED: 'green', REJECTED: 'red', PENDING: 'gold', REVIEW: 'gold' }[decision] || 'default');
const safeJson = s => { try { return typeof s === 'string' ? JSON.parse(s) : (s || []); } catch { return []; } };

const roadmapFeatures = [
  ['Consented real-time signal connectors', 'Live mobile, transaction and employment feeds with explicit opt-in.'],
  ['Guarded LLM reviewer assistance', 'Bedrock-assisted explanations behind a deterministic fallback.'],
  ['Decision provenance & versioned policy', 'Snapshot the exact rule set behind every outcome.'],
  ['Fairness & drift monitoring', 'Continuous evaluation across cohorts and time.'],
];

function FuturePanel() {
  return <section className="future-panel" aria-label="Planned capabilities">
    <div className="future-panel-head"><span className="section-kicker">ROADMAP · PLANNED</span><h3>Where this goes next</h3></div>
    <div className="future-grid">
      {roadmapFeatures.map(([title, detail]) => <article key={title}><Tag color="cyan">Planned</Tag><strong>{title}</strong><p>{detail}</p></article>)}
    </div>
  </section>;
}

/* PRISM-style "what data was pulled and why" timeline. */
function DataPullTimeline({ application }) {
  const steps = safeJson(application.dataPullSources);
  if (!steps.length) return null;
  return (
    <section className="detail-block">
      <div className="detail-block-head"><PartitionOutlined /><div><strong>Data pulled for this decision</strong><p>Every signal, and why it mattered — a PRISM-style dynamic pull.</p></div></div>
      <Timeline
        items={steps.map(s => ({
          color: 'blue',
          children: <div className="pull-step">
            <Space size={6}><Tag color="geekblue">{s.stage}</Tag><Text type="secondary">{s.source}</Text></Space>
            <p>{s.why}</p>
          </div>,
        }))}
      />
    </section>
  );
}

/* Meaningful multi-agent handoff trace: what each agent did and handed off. */
function AgentTrace({ application }) {
  const trace = safeJson(application.agentTrace);
  if (!trace.length) return null;
  return (
    <section className="detail-block">
      <div className="detail-block-head"><ApartmentOutlined /><div><strong>Decision trace · agents</strong><p>What each agent contributed and handed to the next.</p></div></div>
      <List
        size="small"
        dataSource={trace}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              avatar={<Tag color="purple">{item.role}</Tag>}
              title={item.action}
              description={<Text type="secondary">{item.handoff}</Text>}
            />
          </List.Item>
        )}
      />
    </section>
  );
}

export default function ApplicationDetail({ application, auditLogs, onClose }) {
  if (!application) return null;
  const appLogs = (auditLogs || []).filter(log => String(log.applicationId) === String(application.id));
  const decided = Boolean(application.creditDecision);
  const conditions = safeJson(application.conditions);
  const gates = safeJson(application.policyGates);
  return <Drawer
    title={null}
    width={780}
    open={Boolean(application)}
    onClose={onClose}
    destroyOnClose
    className="application-detail"
  >
    <header className="detail-hero">
      <div>
        <span className="section-kicker">APPLICATION #{application.id}</span>
        <h2>{application.applicantName}</h2>
        <p>{application.employmentType?.replaceAll('_', ' ')} · Age {application.age} · ₹{Number(application.annualIncome || 0).toLocaleString('en-IN')} income</p>
      </div>
      <div className="detail-tags">
        {decided
          ? <Tag color={tagColor(application.creditDecision)}>{application.creditDecision}</Tag>
          : <Tag color="default">AWAITING DECISION</Tag>}
        {application.confidenceScore != null && <Tag>{application.confidenceScore}% confidence</Tag>}
        {application.fraudRisk && <Tag color={application.fraudRisk === 'HIGH' ? 'red' : application.fraudRisk === 'LOW' ? 'green' : 'gold'}>{application.fraudRisk} fraud risk</Tag>}
        {application.reviewStatus && <Tag color="blue">{application.reviewStatus.replaceAll('_', ' ')}</Tag>}
        {application.decisionLatencyMs > 0 && <Tag icon={<ThunderboltOutlined />} color="cyan">decided in {application.decisionLatencyMs} ms</Tag>}
      </div>
    </header>

    {decided ? (
      <>
        <DecisionCard decision={application} />
        {application.decisionRationale && (
          <Alert type="info" showIcon icon={<PartitionOutlined />} className="rationale-alert"
            message="Why this decision"
            description={application.decisionRationale} />
        )}
        {application.partnerSignals && (
          <Alert type="success" showIcon className="partner-alert"
            message="Internal + partner signal advantage"
            description={application.partnerSignals} />
        )}
        <AgentPipeline complete decision={application} activeStep={5} />
        <AgentTrace application={application} />
        <DataPullTimeline application={application} />
        <section className="detail-viz">
          <RiskRadar application={application} />
          <FraudHeatmap application={application} />
        </section>
        <TraditionalComparison decision={application} application={application} />
        {application.documentPath && (
          <section className="document-evidence">
            <span>REVIEWER EVIDENCE ON FILE</span>
            <strong><FileSearchOutlined /> Document attached</strong>
            <p>This applicant has an uploaded document. Extraction runs through Apache Tika and is shown as advisory evidence only; it never overrides the policy decision.</p>
          </section>
        )}
      </>
    ) : (
      <Empty description="This application has not been analyzed yet." />
    )}

    <section className="detail-audit">
      <div className="detail-audit-head"><SafetyCertificateOutlined /><div><strong>Audit lineage</strong><p>Decision events linked to this application.</p></div></div>
      {appLogs.length ? (
        <Timeline>
          {appLogs.map((log, i) => (
            <Timeline.Item key={log.id || i} color={log.decision === 'APPROVED' ? 'green' : log.decision === 'REJECTED' ? 'red' : 'blue'}>
              <div className="audit-event">
                <Tag color={tagColor(log.decision)}>{log.decision}</Tag>
                <Text className="audit-time">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</Text>
                <Paragraph className="audit-reason">{log.reasoning}</Paragraph>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No audit events yet" />
      )}
    </section>

    <FuturePanel />
  </Drawer>;
}
