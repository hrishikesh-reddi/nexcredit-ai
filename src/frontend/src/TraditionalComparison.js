import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';

function TraditionalComparison({ decision, application }) {
  if (!decision || !application) return <section className="comparison-card preview-comparison"><h3>Traditional vs NexCredit AI</h3><p>Submit an application to compare a conventional-only decision path with alternative data.</p></section>;
  const isNtc = ['GIG_WORKER', 'STUDENT', 'SELF_EMPLOYED'].includes(application.employmentType);
  const approved = decision.creditDecision === 'APPROVED';
  const traditionalVerdict = isNtc
    ? 'THIN FILE · REFERRED'
    : (approved ? 'BOUND BY RULES' : 'DECLINED ON BUREAU');
  const traditionalNote = isNtc
    ? 'No prior loan, so a bureau-only policy refers or declines without reading cash-flow.'
    : (approved ? 'Would approve at a tighter, rules-bound limit with no cash-flow read.'
      : 'Sees only the bureau signal and stops there.');
  const nexText = decision.decisionRationale
    || (approved
      ? `Approved ₹${decision.recommendedCreditLimit?.toLocaleString('en-IN')} at ${decision.pricingBand || 'Standard'} band.`
      : `Declined: ${decision.fraudRisk === 'HIGH' ? 'confirmed fraud indicators in the consented statement' : 'default risk above the reject threshold'}.`);
  return <section className="comparison-card">
    <div className="section-kicker">DECISION CONTEXT</div><h3>Traditional vs NexCredit AI</h3>
    <div className="comparison-grid"><div className="traditional"><span>Traditional model</span><strong><CloseCircleFilled /> {traditionalVerdict}</strong><p>{traditionalNote}</p></div><div className="nexcredit"><span>NexCredit AI</span><strong><CheckCircleFilled /> {decision.creditDecision}</strong><p>{nexText}{decision.cashflowUplift > 0 ? ` Consented cash-flow second look added +${decision.cashflowUplift} pts a bureau-only lender would miss.` : ''}</p></div></div>
    <small>Illustrative prototype baseline not a production lending policy or a CIBIL decision.</small>
  </section>;
}
export default TraditionalComparison;
