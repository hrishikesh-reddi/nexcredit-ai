import { useState } from 'react';
import { Alert, Button, Empty, Input, Progress, Segmented, Table, Tag, Typography } from 'antd';
import { FileSearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { IcDocSalary, IcDocStatement, IcDocKyc, IcDocUtility, IcDocEmployment, IcDocTax } from './icons/NxIcons';
import DocSheet from './icons/DocSheet';
import { searchEvidence } from './Client';
import { errorNotification } from './Notification';

const { Text, Paragraph } = Typography;

/* ---------- Pre-seeded document classes (sample corpus metadata) ---------- */

const CATALOG = [
  {
    key: 'income',
    title: 'Salary slip',
    Icon: IcDocSalary,
    why: 'Verifies declared income and pay regularity, the single strongest income-stability driver in the risk model.',
    documents: [
      {
        name: 'salary-slip-aug2026.pdf',
        pages: 1,
        fields: [
          ['Gross monthly salary', '₹55,000', 94],
          ['Net pay', '₹46,600', 91],
          ['Employer', 'Acme Retail Pvt Ltd', 98],
          ['Pay period', 'Aug 2026', 99],
          ['Deductions (PF + TDS)', '₹8,400', 89],
        ],
      },
      {
        name: 'salary-slip-jul2026.pdf',
        pages: 1,
        fields: [
          ['Gross monthly salary', '₹54,000', 92],
          ['Net pay', '₹45,750', 88],
          ['Employer', 'Acme Retail Pvt Ltd', 97],
          ['Pay period', 'Jul 2026', 99],
        ],
      },
    ],
  },
  {
    key: 'bank',
    title: 'Bank statement',
    Icon: IcDocStatement,
    why: 'Grounds the consented cash-flow overlay: average credits, salary regularity, low-balance days and returned payments all come from this document.',
    documents: [
      {
        name: 'statement-6m-hdfc.pdf',
        pages: 6,
        fields: [
          ['Average monthly credit', '₹47,800', 89],
          ['Salary credits received', '6 of 6 months', 96],
          ['Low-balance days / month', '4', 85],
          ['Returned payments (6 mo)', '0', 97],
          ['Account vintage', '3y 2m', 92],
        ],
      },
      {
        name: 'statement-6m-axis.pdf',
        pages: 5,
        fields: [
          ['Average monthly credit', '₹44,150', 87],
          ['Salary credits received', '5 of 6 months', 93],
          ['Low-balance days / month', '7', 82],
        ],
      },
    ],
  },
  {
    key: 'identity',
    title: 'KYC / Identity',
    Icon: IcDocKyc,
    why: 'Confirms the applicant is a real, unique person, the first line of defence against synthetic-identity fraud.',
    documents: [
      {
        name: 'aadhaar-masked.pdf',
        pages: 1,
        fields: [
          ['Name match with application', 'Exact match', 99],
          ['Date of birth', '14 Mar 2002', 97],
          ['ID masked format', 'XXXX XXXX 4821', 95],
          ['Liveness check', 'Passed', 96],
        ],
      },
    ],
  },
  {
    key: 'utility',
    title: 'Utility bill',
    Icon: IcDocUtility,
    why: 'Address-stability signal: sustained tenure at one address correlates with repayment discipline.',
    documents: [
      {
        name: 'electricity-bill-sep2026.pdf',
        pages: 1,
        fields: [
          ['Address match with application', 'Exact match', 90],
          ['Tenure at address', '26 months', 84],
          ['Bill paid status', 'Cleared', 93],
        ],
      },
    ],
  },
  {
    key: 'employment',
    title: 'Employment letter',
    Icon: IcDocEmployment,
    why: 'Independent confirmation of role and tenure, reduces reliance on self-declared employment type.',
    documents: [
      {
        name: 'employment-letter-acme.pdf',
        pages: 1,
        fields: [
          ['Designation', 'Field Sales Executive', 93],
          ['Tenure', '1y 4m', 91],
          ['Contract type', 'Full-time', 95],
          ['Notice period', '30 days', 86],
        ],
      },
    ],
  },
  {
    key: 'tax',
    title: 'Tax return',
    Icon: IcDocTax,
    why: 'Annual income triangulation, catches divergence between declared monthly income and filed annual income.',
    documents: [
      {
        name: 'itr-v-ay2026-27.pdf',
        pages: 2,
        fields: [
          ['Gross total income', '₹6,42,000', 95],
          ['Filing date', '12 Jul 2026', 98],
          ['Refund status', 'Nil', 90],
          ['Declared vs filed gap', 'Within 10%', 88],
        ],
      },
    ],
  },
  {
    key: 'gst',
    title: 'GST return',
    Icon: IcDocTax,
    why: 'Triangulates declared business turnover for self and gig applicants, a consented alternative signal that strengthens thin-file inclusion.',
    documents: [
      {
        name: 'gstr-3b-jun2026.pdf',
        pages: 1,
        fields: [
          ['Filed turnover', '₹4,20,000', 93],
          ['Filing status', 'On time', 95],
          ['Tax paid', '₹12,600', 90],
        ],
      },
    ],
  },
];

/* ---------- Helpers ---------- */

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function Highlighted({ text, query }) {
  const tokens = (query || '').trim().split(/\s+/).filter(token => token.length > 2);
  if (!tokens.length) return text;
  try {
    const regex = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, index) => regex.test(part) && index % 2 === 1
      ? <mark key={index} style={{ background: '#f9f871', padding: '0 2px', borderRadius: 2 }}>{part}</mark>
      : <span key={index}>{part}</span>);
  } catch (e) {
    return text;
  }
}

const fieldColumns = [
  { title: 'Field', dataIndex: 'field', key: 'field', render: v => <b>{v}</b> },
  { title: 'Value', dataIndex: 'value', key: 'value' },
  {
    title: 'Confidence', dataIndex: 'confidence', key: 'confidence', width: 180,
    render: v => <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Progress percent={v} showInfo={false} size="small" strokeColor={v >= 90 ? '#0f9d6b' : v >= 80 ? '#c98a14' : '#e5484d'} style={{ flex: 1, margin: 0 }} />
      <span style={{ fontSize: 12 }}>{v}%</span>
    </div>,
  },
];

/* ---------- Search panel ---------- */

function CorpusSearch() {
  const [query, setQuery] = useState('monthly salary credit');
  const [k, setK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runSearch = (topK = k) => {
    if (!query.trim()) return;
    setLoading(true);
    searchEvidence(query.trim(), topK)
      .then(setResult)
      .catch(() => errorNotification('Evidence search failed', 'Check that the backend is running.'));
  };

  const changeK = value => {
    setK(value);
    if (result) {
      runSearch(value);
    }
  };

  const hits = result?.results || [];
  const topScore = Math.max(...hits.map(hit => Number(hit.score) || 0), 0.0001);

  return <section className="nx-card">
    <header className="nx-card-head">
      <h3><FileSearchOutlined /> Semantic search across the evidence corpus</h3>
      {result && (result.semanticSearchAvailable ? <Tag color="green">Semantic search ON</Tag> : <Tag style={{color:'#92400e',background:'#fef3c7',borderColor:'#fde68a'}}>Keyword fallback</Tag>)}
    </header>
    <div className="nx-card-body" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Input style={{ flex: '1 1 260px' }} placeholder="Try: salary credit · income divergence · address proof"
          value={query} onChange={event => setQuery(event.target.value)} onPressEnter={runSearch} allowClear />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="nx-kpi-label">Top-K</span>
          <span style={{border:'1px solid var(--nx-line)',borderRadius:10,padding:'2px'}}><Segmented options={[3, 5, 8]} value={k} onChange={changeK} /></span>
        </div>
        <Button type="primary" loading={loading} onClick={() => runSearch()}>Search</Button>
      </div>
      {hits.length === 0 && result && <Empty description={`No chunks matched "${query}"`} />}
      {hits.map(hit => {
        const relative = Math.round((Math.min(Number(hit.score) || 0, topScore) / topScore) * 100);
        return <div key={`${hit.id}-${hit.source}`} className="nx-evidence-chunk" style={{ border: '1px solid var(--nx-line-2, #eef2f6)', borderRadius: 8, padding: '12px 14px', background: 'var(--nx-surface-2, #fafbfc)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}><FileTextOutlined /> <b>{hit.type}</b> <Text type="secondary">· chunk #{hit.id}</Text></span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
              <Progress percent={relative} showInfo={false} size="small" strokeColor="#1f6feb" style={{ flex: 1, margin: 0 }} />
              <span style={{ fontSize: 12 }}>{relative}% relevance</span>
            </div>
          </div>
          <Paragraph style={{ fontSize: 13, marginBottom: 4 }}>
            “<Highlighted text={String(hit.content).slice(0, 320)} query={query} />{String(hit.content).length > 320 ? '…' : ''}”
          </Paragraph>
          <Text type="secondary" style={{ fontSize: 11.5 }}>source: {hit.source} · retrieved via {result?.semanticSearchAvailable ? 'vector similarity' : 'lexical matching'}</Text>
        </div>;
      })}
    </div>
  </section>;
}

/* ---------- Page ---------- */

export default function EvidenceIntelligence({ applications = [] }) {
  const [selectedKey, setSelectedKey] = useState('income');
  const selectedClass = CATALOG.find(entry => entry.key === selectedKey) || CATALOG[0];
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const selectedDoc = selectedClass.documents[Math.min(selectedDocIndex, selectedClass.documents.length - 1)];
  const totalDocs = CATALOG.reduce((sum, entry) => sum + entry.documents.length, 0);
  const linkedApplicant = applications[applications.length - 1];

  const selectClass = key => { setSelectedKey(key); setSelectedDocIndex(0); };

  return <div>
    <header className="nx-pagehead">
      <div>
        <h1>Evidence Intelligence</h1>
        <p>Document-grounded underwriting evidence. Inspect what each proof class proves, then run retrieval across the indexed corpus.</p>
      </div>
      <div className="nx-pagehead-actions">
        <span className="nx-corpus-chip">Evidence index · {totalDocs} documents · {CATALOG.length} proof classes</span>
        {linkedApplicant && <span className="nx-corpus-chip">latest applicant: {linkedApplicant.applicantName}</span>}
      </div>
    </header>

    <section className="nx-card" style={{ marginBottom: 18 }}>
      <header className="nx-card-head"><h3>Proof classes</h3><span className="nx-sub">sample corpus is illustrative · live uploads extract through Tika</span></header>
      <div className="nx-card-body">
        <div className="nx-proof-grid">
          {CATALOG.map(entry => (
            <button key={entry.key} className={`nx-proof ${selectedKey === entry.key ? 'active' : ''}`} onClick={() => selectClass(entry.key)}>
              <span className="nx-proof-ic"><entry.Icon width={20} height={20} /></span>
              <span className="nx-proof-title">{entry.title}</span>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-sans)', background: selectedKey === entry.key ? '#fff' : '#f1f5f9', color: selectedKey === entry.key ? '#1e40af' : '#64748b', border: selectedKey === entry.key ? '1px solid #bfdbfe' : '1px solid transparent', padding: '2px 7px', borderRadius: 999 }}>{entry.documents.length} PDF{entry.documents.length > 1 ? 's' : ''}</span>
                <span style={{ fontSize: 10, color: '#8a97a6' }}>Tika · pgvector indexed</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>

    <section className="nx-card" style={{ marginBottom: 16 }}>
      <header className="nx-card-head">
        <h3>{selectedClass.title} · extracted fields</h3>
        {selectedClass.documents.length > 1 && (
          <Segmented size="small" options={selectedClass.documents.map((doc, index) => ({ label: doc.name, value: index }))}
            value={Math.min(selectedDocIndex, selectedClass.documents.length - 1)} onChange={setSelectedDocIndex} />
        )}
      </header>
      <div className="nx-card-body nx-evidence-detail">
        <div className="nx-evidence-left" style={{display:'grid', gap:16}}>
          <Alert type="info" showIcon message={<span><b>Why this evidence matters:</b> {selectedClass.why}</span>} />
          <div style={{ height: 16 }} />
          <DocSheet entry={selectedClass} doc={selectedDoc} applicantName={linkedApplicant?.applicantName} docCount={selectedClass.documents.length} />
        </div>
        <div className="nx-evidence-right">
          <Table className="nx-table" rowKey="field" size="small" columns={fieldColumns}
            dataSource={selectedDoc.fields.map(([field, value, confidence]) => ({ field, value, confidence }))}
            pagination={false} />
          <Text type="secondary" style={{ fontSize: 12 }}>Extracted fields are reviewer evidence only, they never silently change a decision. Upload a real document via a new application to see live Tika extraction and divergence checks.</Text>
        </div>
      </div>
    </section>

    <CorpusSearch />
  </div>;
}
