import { Alert, Button, Collapse, Progress, Statistic, Tag, Typography, List } from 'antd';
import { FileTextOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Text } = Typography;

const decisionColor = decision => ({ APPROVED: 'success', REJECTED: 'error', PENDING: 'warning' }[decision] || 'default');
const decisionWord = decision => ({ APPROVED: 'APPROVED', REJECTED: 'DECLINED', PENDING: 'REFERRED FOR HUMAN REVIEW' }[decision] || decision);
const prettyName = key => ({
  mobile: 'Mobile usage',
  transaction: 'Transaction behaviour',
  social: 'Social signal',
  income: 'Income stability',
  age: 'Applicant age',
  employment: 'Employment type',
}[key] || key);

const safeJson = s => { try { return typeof s === 'string' ? JSON.parse(s) : (s || []); } catch (e) { return []; } };

function buildLetterHtml(decision, application) {
  const name = application?.applicantName || 'Applicant';
  const reference = `NC-${String(decision.applicationId || 0).padStart(6, '0')}`;
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const notApproved = decision.creditDecision !== 'APPROVED';
  const codes = safeJson(decision.adverseReasonCodes);
  const fraudNote = decision.fraudRisk === 'HIGH'
    ? 'Additional verification is required because automated fraud screening flagged inconsistencies between declared information and supporting evidence.'
    : decision.fraudRisk === 'MEDIUM'
      ? 'Standard verification checks apply as part of routine screening.'
      : 'Routine verification checks were completed as part of this assessment.';
  const outcomeBlock = notApproved
    ? `<h2>Outcome: ${decisionWord(decision.creditDecision)}</h2>
       <p>${decision.creditDecision === 'REJECTED'
         ? 'We are unable to extend credit on this application at this time.'
         : 'Your application could not be completed automatically and has been referred to a human underwriter for final review.'}</p>
       ${codes.length ? `<p><strong>Principal reasons for this outcome:</strong></p><ol>${codes.map(code => `<li>${code}</li>`).join('')}</ol>` : ''}
       <p>You may request the specific reasons for this decision and a free copy of any consumer report relied upon, within the period provided by applicable fair-lending principles.</p>`
    : `<h2>Outcome: Approved</h2>
       <p>We are pleased to inform you that your application has been approved.</p>
       ${decision.recommendedCreditLimit != null ? `<p><strong>Recommended starting credit line:</strong> ₹${Number(decision.recommendedCreditLimit).toLocaleString('en-IN')}, sized from your declared income and assessment confidence. Final terms are confirmed by a human underwriter.</p>` : ''}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Credit Decision Notice ${reference}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.55; }
    .letterhead { border-bottom: 3px solid #102a43; padding-bottom: 12px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: baseline; }
    .letterhead .brand { font-size: 22px; font-weight: bold; color: #102a43; letter-spacing: -0.5px; }
    .letterhead .brand span { color: #0f7c83; }
    .meta { font-size: 12px; color: #555; text-align: right; line-height: 1.5; }
    h2 { font-size: 16px; margin: 22px 0 8px; }
    p { margin: 10px 0; font-size: 14px; }
    ol li, ul li { font-size: 14px; margin-bottom: 6px; }
    .notice { margin-top: 30px; padding: 14px 16px; background: #f4f7fa; border-left: 4px solid #0f7c83; font-size: 12.5px; }
    .signoff { margin-top: 34px; font-size: 14px; }
    @media print { body { margin: 10mm auto; } }
  </style></head><body>
  <div class="letterhead"><div class="brand">NexCredit <span>AI</span></div><div class="meta">Reference: ${reference}<br/>Date: ${date}</div></div>
  <p>Dear ${name},</p>
  <p>Thank you for your credit application submitted through NexCredit AI. This notice explains the outcome of our assessment of the alternative-data signals, declared financials and supporting documents you provided.</p>
  ${outcomeBlock}
  <p><strong>Assessment confidence:</strong> ${decision.confidenceScore}% using model version ${decision.modelVersion || 'logreg-hybrid-v3'} (logistic regression trained on real Home Credit applications + consented alternative-data signals).</p>
  <p><strong>Fraud screening:</strong> risk level ${decision.fraudRisk || 'LOW'}. ${fraudNote}</p>
  <div class="notice"><strong>Your rights.</strong> Every NexCredit decision is explainable and auditable. Where an application is declined or referred, the principal reasons are listed above, age is never used as a scoring attribute, and any referred case receives human review before a final determination. This document can be requested alongside the full decision audit trail.</div>
  <div class="notice" style="border-left-color:#c98a14;background:#fffbeb;"><strong>Demo disclosure.</strong> This notice was generated by a prototype underwriting system for demonstration purposes using consented synthetic data. It is not a real lending decision and creates no obligation for any party.</div>
  <div class="signoff">Sincerely,<br/><strong>NexCredit AI Governance Office</strong><br/><span style="font-size:12px;color:#667;">Decided in ${decision.decisionLatencyMs} ms · full stage trace available to reviewers</span></div>
  <div style="position:fixed;top:16px;right:16px;"><button onclick="window.print()" style="padding:8px 14px;font-family:Arial;background:#102a43;color:#fff;border:0;border-radius:6px;cursor:pointer;">Print / Save as PDF</button></div>
  </body></html>`;
}

function ModelInsights({ contributions }) {
  if (!contributions) return null;
  const entries = Object.entries(contributions)
    .map(([k, v]) => [k, v])
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, v]) => Math.abs(v)), 0.0001);
  return (
    <Collapse size="small" ghost items={[{
      key: 'ml',
      label: 'Model insights (feature attribution)',
      children: (
        <div>
          {entries.map(([k, v]) => {
            const pct = Math.round((Math.abs(v) / max) * 100);
            const positive = v >= 0;
            return (
              <div key={k} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{prettyName(k)}</span>
                  <span>{positive ? 'supports approval' : 'against approval'}</span>
                </div>
                <Progress percent={pct} showInfo={false}
                  strokeColor={positive ? '#52c41a' : '#ff4d4f'} />
              </div>
            );
          })}
        </div>
      ),
    }]} />
  );
}

function exportLetter(decision, application) {
  const win = window.open('', '_blank', 'width=780,height=900');
  if (!win) return;
  win.document.open();
  win.document.write(buildLetterHtml(decision, application));
  win.document.close();
}

function DecisionCard({ decision, application }) {
  if (!decision) return null;
  const type = decision.creditDecision === 'APPROVED' ? 'success' : decision.creditDecision === 'REJECTED' ? 'error' : 'warning';
  return (
    <Alert className="decision-card" type={type} showIcon
      message={<span>Decision: <Tag color={decisionColor(decision.creditDecision)}>{decision.creditDecision}</Tag> {decision.confidenceScore}% confidence
        {decision.mlPowered && <Tag color="geekblue" style={{ marginLeft: 8 }}>ML scored</Tag>}
        {decision.decisionLatencyMs > 0 && <Tag color="cyan" style={{ marginLeft: 8 }}>decided in {decision.decisionLatencyMs} ms</Tag>}
        {decision.fraudRisk && <Tag color={decision.fraudRisk === 'HIGH' ? 'red' : decision.fraudRisk === 'LOW' ? 'green' : 'gold'} style={{ marginLeft: 8 }}>Fraud: {decision.fraudRisk}</Tag>}
        {decision.modelVersion && <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>model v{decision.modelVersion}</Text>}</span>}
      description={<>
        {decision.recommendedCreditLimit != null && (
          <div style={{ margin: '4px 0 10px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <Statistic title="Recommended credit limit" value={decision.recommendedCreditLimit} prefix="₹" precision={0}
              valueStyle={{ color: '#1f6feb', fontWeight: 700 }} />
            {decision.pricingBand && <Tag color="blue">Pricing band: {decision.pricingBand}</Tag>}
            {decision.gradeBand && <Tag color="default">Grade {decision.gradeBand}</Tag>}
            {decision.pdProbability != null && <Text type="secondary" style={{ fontSize: 12 }}>PD {Math.round(decision.pdProbability * 100)}%</Text>}
            <Text type="secondary" style={{ fontSize: 12 }}>Sized from declared income × model confidence. Reviewer may override.</Text>
          </div>
        )}
        <div style={{ display: 'flex', gap: 28, margin: '6px 0 10px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 200, flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Creditworthiness confidence</Text>
            <Progress percent={decision.confidenceScore || 0} showInfo strokeColor="#1f6feb" />
          </div>
          <div style={{ minWidth: 200, flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Fraud / identity risk</Text>
            <Progress percent={decision.fraudScore || 0} showInfo strokeColor="#cf1322" />
          </div>
        </div>
        {decision.cashflowUplift > 0 && (
          <div style={{ margin: '4px 0 10px' }}>
            <Tag icon={<ThunderboltOutlined />} color="green">Cash-flow second look: +{decision.cashflowUplift} pts</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>Consented bank data lifted confidence a bureau-only file would have missed.</Text>
          </div>
        )}
        {decision.adverseReasonCodes && safeJson(decision.adverseReasonCodes).length > 0 && (
          <div style={{ margin: '4px 0 10px' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Adverse-action reason codes (regulatory notice):</strong>
            {safeJson(decision.adverseReasonCodes).map(code => <Tag key={code} color="volcano" style={{ marginBottom: 4 }}>{code}</Tag>)}
          </div>
        )}
        {decision.conditions && safeJson(decision.conditions).length > 0 && (
          <div style={{ margin: '4px 0 10px' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Approval conditions / monitoring:</strong>
            <List size="small" dataSource={safeJson(decision.conditions)} renderItem={c => <List.Item style={{ padding: '2px 0', border: 0 }}><Text style={{ fontSize: 13 }}>• {c}</Text></List.Item>} />
          </div>
        )}
        <Collapse size="small" ghost items={[{ key: 'reasoning', label: 'Full decision reasoning', children: <span>{decision.reasoning}</span> }]} />
        <ModelInsights contributions={decision.modelContributions} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <strong>Fraud label:</strong> {decision.fraudRisk}
          <Button size="small" icon={<FileTextOutlined />} onClick={() => exportLetter(decision, application)}>Export decision letter</Button>
        </div>
      </>} />
  );
}

export default DecisionCard;
