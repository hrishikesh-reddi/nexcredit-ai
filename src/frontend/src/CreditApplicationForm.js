import { useEffect, useState } from 'react';
import { Alert, Button, Col, Drawer, Form, Input, InputNumber, Progress, Row, Select, Space, Tag, Typography, Upload } from 'antd';
import { BankOutlined, CheckCircleOutlined, ReloadOutlined, RobotOutlined, SendOutlined, UploadOutlined } from '@ant-design/icons';
import { analyzeCreditApplication, uploadCreditDocument, explainDecision, reanalyzeApplication, askCopilot, ingestTransactions, getCashflowFeatures } from './Client';
import { errorNotification, successNotification } from './Notification';
import DecisionCard from './DecisionCard';
import AgentPipeline from './AgentPipeline';
import TraditionalComparison from './TraditionalComparison';
import FraudHeatmap from './FraudHeatmap';
import RiskRadar from './RiskRadar';
import DocumentScanPreview from './DocumentScanPreview';

const scoreRule = { required: true, type: 'number', min: 0, max: 100, message: 'Enter a score from 0 to 100' };

function ScoreBars({ values }) {
  return <Row gutter={16} className="score-bars">
    {[['Mobile', values.mobileUsageScore], ['Transactions', values.transactionBehaviorScore], ['Social', values.socialSignalScore]].map(([label, score]) => <Col span={8} key={label}><span>{label}</span><Progress percent={score || 0} showInfo={false} strokeColor="#1f6feb" /></Col>)}
  </Row>;
}

function CreditApplicationForm({ open, onClose, onCreated }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [document, setDocument] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [documentEvidence, setDocumentEvidence] = useState(null);
  const [analyzedApp, setAnalyzedApp] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatting, setChatting] = useState(false);
  const [cashflowShared, setCashflowShared] = useState(false);
  const [cashflowFetching, setCashflowFetching] = useState(false);
  const [cashflowMetrics, setCashflowMetrics] = useState(null);

  const toggleCashflow = () => {
    if (cashflowShared || cashflowFetching) {
      setCashflowShared(false);
      setCashflowMetrics(null);
      return;
    }
    setCashflowFetching(true);
    const values = form.getFieldsValue();
    setTimeout(() => {
      setCashflowFetching(false);
      setCashflowShared(true);
    }, 1400);
  };
  useEffect(() => {
    if (!document) return undefined;
    setScanning(true);
    const timer = setTimeout(() => setScanning(false), 2200);
    return () => clearTimeout(timer);
  }, [document]);
  const submit = async values => {
    setSubmitting(true);
    setDecision(null);
    setDocumentEvidence(null);
    setChatMessages([]);
    try {
      const { supportingDocument, ...application } = values;
      if (cashflowShared) {
        Object.assign(application, {
          cashflowShared: true,
          mobileUsageScore: 78,
          transactionBehaviorScore: 75,
          socialSignalScore: 80,
        });
      } else {
        Object.assign(application, {
          mobileUsageScore: 50,
          transactionBehaviorScore: 50,
          socialSignalScore: 50,
        });
      }
      for (let stage = 0; stage < 6; stage += 1) {
        setActiveStep(stage);
        await new Promise(resolve => setTimeout(resolve, 650));
      }
      const result = await analyzeCreditApplication(application);
      setDecision(result);
      setAnalyzedApp(application);
      setExplanation(null);
      setActiveStep(6);
      const selectedFile = supportingDocument?.[0]?.originFileObj;
      if (selectedFile && result.applicationId) {
        setDocumentEvidence(await uploadCreditDocument(result.applicationId, selectedFile));
      }
      if (cashflowShared && result?.applicationId) {
        try {
          await ingestTransactions(result.applicationId);
          const feat = await getCashflowFeatures(result.applicationId);
          if (feat) {
            setCashflowMetrics({
              cashflowAvgMonthlyCredit: feat.avgMonthlyCredit ?? feat.cashflowAvgMonthlyCredit,
              cashflowSalaryRegularity: feat.salaryRegularityPct ?? feat.cashflowSalaryRegularity,
              cashflowLowBalanceDays: feat.lowBalanceDays ?? feat.cashflowLowBalanceDays,
              cashflowReturnedPayments: feat.returnedPayments ?? feat.cashflowReturnedPayments,
            });
          }
        } catch (e) { /* keep cashflowMetrics null; UI hides the 4 cards gracefully */ }
      }
      successNotification('Application analyzed', `${values.applicantName} is ${result.creditDecision}`);
      onCreated();
    } catch (error) {
      errorNotification('Analysis could not be completed', 'Check that the backend is running and all form values are valid.');
    } finally { setSubmitting(false); }
  };
  const close = () => { setDecision(null); setActiveStep(-1); setDocument(null); setDocumentEvidence(null); setAnalyzedApp(null); setExplanation(null); setChatMessages([]); setChatQuestion(''); setCashflowShared(false); setCashflowMetrics(null); form.resetFields(); onClose(); };
  const explain = async () => {
    if (!analyzedApp) return;
    setExplaining(true);
    try {
      setExplanation(await explainDecision(analyzedApp));
    } catch (error) {
      errorNotification('Could not generate explanation', 'Confirm the backend is running and try again.');
    } finally { setExplaining(false); }
  };
  const rerunWithEvidence = async () => {
    if (!decision?.applicationId) return;
    setRerunning(true);
    try {
      const updated = await reanalyzeApplication(decision.applicationId);
      setDecision(updated);
      setExplanation(null);
      successNotification('Evidence reconciled', `Fraud signals recomputed: ${updated.fraudRisk} risk, decision ${updated.creditDecision}`);
      onCreated();
    } catch (error) {
      errorNotification('Re-analysis failed', 'Confirm that the backend is running and the document was extracted.');
    } finally { setRerunning(false); }
  };
  const askCopilotQuestion = async question => {
    if (!decision?.applicationId || !question?.trim()) return;
    setChatMessages(previous => [...previous, { role: 'q', text: question.trim() }]);
    setChatQuestion('');
    setChatting(true);
    try {
      const response = await askCopilot(decision.applicationId, question);
      setChatMessages(previous => [...previous, { role: 'a', text: response.answer, aiPowered: response.aiPowered, steps: response.agentSteps || [] }]);
    } catch (error) {
      setChatMessages(previous => [...previous, { role: 'a', text: 'The Copilot could not answer right now. Confirm the backend is running and try again.' }]);
    } finally { setChatting(false); }
  };
  const COPILOT_SUGGESTIONS = ['Why this decision?', 'Any fraud concerns?', 'How can this applicant improve?', 'What credit limit applies?'];
  return <Drawer title={null} width={720} style={{ maxWidth: '92vw' }} open={open} onClose={close} destroyOnClose className="nx-app-drawer" styles={{ body: { padding: 0 } }}>
    <div className="nx-app-drawer-head">
      <span className="nx-sub">NEW APPLICATION</span>
      <h2>Credit application</h2>
      <p>Enter applicant details and alternative-data signals. NexCredit returns an explainable, reviewer-ready decision.</p>
    </div>
    <div className="nx-app-drawer-body">
    <Form form={form} layout="vertical" onFinish={submit} initialValues={{ employmentType: 'SALARIED' }}>
      <section className="nx-form-section">
        <h4 className="nx-form-title">Applicant profile</h4>
        <Row gutter={16}>
          <Col xs={24} md={12}><Form.Item name="applicantName" label="Applicant name" rules={[{ required: true }]}><Input placeholder="Ravi Kumar" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="age" label="Age" rules={[{ required: true, type: 'number', min: 18 }]}><InputNumber min={18} max={100} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}><Form.Item name="annualIncome" label="Annual income (₹)" rules={[{ required: true, type: 'number', min: 0 }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="employmentType" label="Employment type" rules={[{ required: true }]}><Select options={['SALARIED', 'SELF_EMPLOYED', 'GIG_WORKER', 'STUDENT'].map(value => ({ value, label: value.replace('_', ' ') }))} /></Form.Item></Col>
        </Row>
      </section>
      <section className="nx-form-section">
        <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 10 }}>
          Alternative-data signals are read automatically from consented sources (Sahamati Account Aggregator, telco) in production. In this demo they are simulated so you can see the confidence uplift they produce.
        </Typography.Paragraph>
      </section>
      <section className="nx-form-section">
        <h4 className="nx-form-title">Consented cash-flow sharing <Tag color="blue">AA sandbox (simulated)</Tag></h4>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 10 }}>
          Optional: link a consented bank-data feed. Healthy cash-flow signals add a clearly labelled confidence uplift to your assessment.
        </Typography.Paragraph>
        {cashflowShared
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[['Avg monthly credit', `₹${Number(cashflowMetrics.cashflowAvgMonthlyCredit).toLocaleString('en-IN')}`],
                ['Salary regularity', `${cashflowMetrics.cashflowSalaryRegularity}/100`],
                ['Low-balance days / month', String(cashflowMetrics.cashflowLowBalanceDays)],
                ['Returned payments (6 mo)', String(cashflowMetrics.cashflowReturnedPayments)]].map(([label, value]) => (
                <div key={label} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px' }}>
                  <div className="nx-kpi-label" style={{ fontSize: 11 }}>{label}</div>
                  <b><CheckCircleOutlined style={{ color: '#16a34a' }} /> {value}</b>
                </div>
              ))}
            </div>
          : <Button icon={<BankOutlined />} onClick={toggleCashflow} loading={cashflowFetching}>
              {cashflowFetching ? 'Reading statements…' : 'Link bank (AA sandbox)'}
            </Button>}
      </section>
      <section className="nx-form-section">
        <h4 className="nx-form-title">Supporting evidence</h4>
        <Form.Item name="supportingDocument" label="Supporting document (optional)" valuePropName="fileList" getValueFromEvent={event => event?.fileList}>
          <Upload beforeUpload={() => false} maxCount={1} accept=".pdf,.png,.jpg,.jpeg" onChange={({ file }) => setDocument(file.originFileObj || file)}><Button icon={<UploadOutlined />}>Attach income proof or bank statement</Button></Upload>
        </Form.Item>
        <DocumentScanPreview file={document} scanning={scanning} />
        {documentEvidence && <section className="document-evidence" aria-label="Extracted document evidence"><span>EXTRACTED REVIEWER EVIDENCE</span><strong>{documentEvidence.extractionStatus.replaceAll('_', ' ')}</strong><p>{documentEvidence.textPreview || 'No readable text was detected. The original document remains available for human review.'}</p><small>This evidence is informational only; it does not automatically change the credit decision.</small></section>}
        {documentEvidence && decision?.applicationId && (
          <Button style={{ marginTop: 10 }} type="dashed" icon={<ReloadOutlined />} loading={rerunning} onClick={rerunWithEvidence}>
            Re-run analysis with this evidence (reconcile declared vs document income)
          </Button>
        )}
      </section>
      <AgentPipeline activeStep={activeStep} complete={activeStep >= 6} decision={decision} />
      <DecisionCard decision={decision} application={analyzedApp || form.getFieldsValue()} />
      {decision && <section className="explain-decision" aria-label="Explain decision">
        <Button onClick={explain} loading={explaining}>Explain this decision</Button>
        {explanation && <Alert
          className="explanation-card"
          type="info"
          showIcon
          message={<span>Explanation {explanation.aiPowered ? <Tag color="purple">AI powered</Tag> : <Tag>Rule based</Tag>}</span>}
          description={<>
            <p>{explanation.explanation}</p>
            {explanation.disclaimer && <small className="disclaimer">{explanation.disclaimer}</small>}
          </>}
        />}
      </section>}
      {decision && <><TraditionalComparison decision={decision} application={form.getFieldsValue()} /><Row gutter={[16, 16]}><Col xs={24} md={12}><FraudHeatmap application={decision} /></Col><Col xs={24} md={12}><RiskRadar application={{ ...form.getFieldsValue(), ...decision }} /></Col></Row></>}
      {decision?.applicationId && (
        <section className="nx-copilot" aria-label="Underwriting copilot" style={{ marginTop: 16, padding: 14, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <h4 className="nx-form-title" style={{ marginBottom: 4 }}><RobotOutlined /> Underwriting Copilot</h4>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Analyst assistant grounded in this application's stored data. It advises reviewers and never issues decisions.</Typography.Text>
          <div style={{ margin: '10px 0' }}>
            {chatMessages.length === 0 && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Ask a question to inspect the decision trail.</Typography.Text>}
            {chatMessages.map((message, index) => message.role === 'q'
              ? <div key={index} style={{ textAlign: 'right', margin: '6px 0' }}><span style={{ background: '#1f6feb', color: '#fff', padding: '6px 12px', borderRadius: 12, display: 'inline-block', fontSize: 13 }}>{message.text}</span></div>
              : <Alert key={index} style={{ marginBottom: 8, textAlign: 'left' }} type="info" showIcon
                  message={<span>Copilot {message.aiPowered ? <Tag color="purple">AI powered · agentic</Tag> : <Tag>Grounded (deterministic)</Tag>}</span>}
                  description={<>
                    {message.steps?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>AGENT TRACE, tools the model chose to call:</Typography.Text>
                        {message.steps.map((step, stepIndex) => (
                          <Tag key={stepIndex} color="blue" style={{ fontFamily: 'monospace', fontSize: 11, marginBottom: 4 }}>{`step ${stepIndex + 1}`} · {step}</Tag>
                        ))}
                      </div>
                    )}
                    <span style={{ fontSize: 13 }}>{message.text}</span>
                  </>} />)}
          </div>
          <Space.Compact style={{ width: '100%' }}>
            <Input value={chatQuestion} onChange={event => setChatQuestion(event.target.value)}
              placeholder="Ask about this application…" onPressEnter={() => askCopilotQuestion(chatQuestion)} disabled={chatting} />
            <Button type="primary" icon={<SendOutlined />} loading={chatting} onClick={() => askCopilotQuestion(chatQuestion)}>Ask</Button>
          </Space.Compact>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COPILOT_SUGGESTIONS.map(suggestion => <Button key={suggestion} size="small" onClick={() => askCopilotQuestion(suggestion)} disabled={chatting}>{suggestion}</Button>)}
          </div>
        </section>
      )}
      <Button type="primary" htmlType="submit" loading={submitting} block>Analyze application</Button>
    </Form>
    </div>
  </Drawer>;
}
export default CreditApplicationForm;
