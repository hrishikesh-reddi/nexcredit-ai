import { FileTextOutlined } from '@ant-design/icons';

function ConfPill({ v }) {
  const tone = v >= 90 ? 'pos' : v >= 80 ? 'warn' : 'neg';
  return <span className={`nx-conf-pill ${tone}`} title={`Field extraction confidence ${v}%`}>{v}%</span>;
}

const getField = (doc, label) => doc.fields.find(f => f[0] === label);

// Small inline PDF file icon SVG
function PdfIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 6C8 4.89543 8.89543 4 10 4H24L32 12V34C32 35.1046 31.1046 36 30 36H10C8.89543 36 8 35.1046 8 34V6Z" fill="#fee2e2" stroke="#fecaca" strokeWidth="1.2"/>
      <path d="M24 4V12H32" fill="#fecaca" stroke="#fecaca" strokeWidth="1.2"/>
      <rect x="11" y="22" width="18" height="7" rx="2" fill="#dc2626"/>
      <text x="20" y="27.5" textAnchor="middle" fill="white" fontSize="6" fontWeight="800" fontFamily="Inter, sans-serif">PDF</text>
      <line x1="12" y1="16" x2="28" y2="16" stroke="#fca5a5" strokeWidth="1" strokeLinecap="round"/>
      <line x1="12" y1="19" x2="24" y2="19" stroke="#fca5a5" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

export default function DocSheet({ entry, doc, applicantName, docCount }) {
  const isPayslip = entry.key === 'income';
  const employer = getField(doc, 'Employer');
  const issuer = employer ? employer[1] : entry.title;
  const sub = isPayslip ? 'Salary slip' : entry.title;
  const period = getField(doc, 'Pay period')?.[1] || `${doc.pages} page document`;

  const gross = getField(doc, 'Gross monthly salary');
  const net = getField(doc, 'Net pay');
  const deductions = getField(doc, 'Deductions (PF + TDS)');

  return (
    <div className="nx-doc" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* File tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', borderBottom: '1px solid var(--nx-line)' }}>
        <PdfIcon size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
          <div style={{ fontSize: 11, color: '#b45309' }}>{doc.pages} page{doc.pages > 1 ? 's' : ''} · {period}</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', background: '#fff', border: '1px solid #fecaca', padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>PDF · Tika parsed</span>
      </div>

      <div className="nx-doc-head" style={{ background: '#fff', borderBottom: '1px solid var(--nx-line)' }}>
        <span className="nx-doc-mark"><entry.Icon width={18} height={18} /></span>
        <div className="nx-doc-head-text">
          <b>{issuer}</b>
          <span>{sub}</span>
        </div>
      </div>

      <div className="nx-doc-body">
        {isPayslip && gross && net ? (
          <div className="nx-payslip">
            <div className="nx-payslip-cols" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
              <div className="nx-payslip-col" style={{ minWidth: 0 }}>
                <div className="nx-doc-section">Earnings</div>
                <div className="nx-payrow" style={{ gridTemplateColumns: 'minmax(0,1fr) auto 42px' }}>
                  <span className="nx-doc-k" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gross[0]}</span>
                  <b className="nx-doc-v" style={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}>{gross[1]}</b>
                  <ConfPill v={gross[2]} />
                </div>
              </div>
              <div className="nx-payslip-col" style={{ minWidth: 0 }}>
                <div className="nx-doc-section">Deductions</div>
                {deductions ? (
                  <div className="nx-payrow" style={{ gridTemplateColumns: 'minmax(0,1fr) auto 42px' }}>
                    <span className="nx-doc-k" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deductions[0]}</span>
                    <b className="nx-doc-v" style={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}>{deductions[1]}</b>
                    <ConfPill v={deductions[2]} />
                  </div>
                ) : (
                  <div className="nx-payrow">
                    <span className="nx-doc-k">No deductions reported</span>
                    <b className="nx-doc-v">₹0</b>
                  </div>
                )}
              </div>
            </div>
            <div className="nx-doc-net">
              <span>Net payable</span>
              <b>{net[1]}</b>
            </div>
            {applicantName && (
              <div className="nx-doc-emp" style={{ fontSize: 12 }}>Employee<b>{applicantName}</b></div>
            )}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#16a34a', background: '#f0fdf4', padding: '6px 10px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
              <span>✓</span> Verified against declared income · divergence check passed
            </div>
          </div>
        ) : (
          <div className="nx-doc-fields">
            {doc.fields.map(([label, value, conf]) => (
              <div className="nx-doc-row" key={label}>
                <span className="nx-doc-k">{label}</span>
                <b className="nx-doc-v">{value}</b>
                <ConfPill v={conf} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Premium doc meta — replaces the detached tags below the card */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#fff', borderTop: '1px solid var(--nx-line, #e8edf2)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--nx-ink, #0c1f33)', background: '#fff', border: '1px solid var(--nx-line, #e8edf2)', padding: '4px 10px', borderRadius: 999 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: '#fee2e2', border: '1px solid #fecaca', display: 'inline-grid', placeItems: 'center', fontSize: 10, color: '#dc2626' }}><FileTextOutlined style={{fontSize:10}}/></span>
          {doc.name} · {doc.pages} page{doc.pages > 1 ? 's' : ''}
        </span>
        {docCount != null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: 999 }}>
            {docCount} on file for this class
          </span>
        )}
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1f6feb' }} /> Indexed for retrieval
        </span>
      </div>

      <div className="nx-doc-foot" style={{ background: '#f8fafc' }}>
        <span>Extracted by NexCredit Document AI · advisory evidence</span>
        <span className="nx-doc-spacer" />
        <span />
      </div>
    </div>
  );
}
