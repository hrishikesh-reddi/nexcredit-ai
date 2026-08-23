import { CheckCircleFilled, FileSearchOutlined, LoadingOutlined } from '@ant-design/icons';
import { Progress } from 'antd';

function DocumentScanPreview({ file, scanning }) {
  if (!file) return null;
  const stages = ['Extracting declared income pattern', 'Checking employment consistency', 'Cross-referencing application fields'];
  const finished = !scanning;
  return <section className="document-scan"><div><FileSearchOutlined /><strong>{finished ? 'Document scan preview complete' : `Scanning ${file.name}…`}</strong></div>{stages.map((stage, index) => <div className="scan-stage" key={stage}><span>{finished ? <CheckCircleFilled /> : index === 0 ? <LoadingOutlined spin /> : '○'}</span><div><b>{stage}</b><Progress percent={finished ? 100 : index === 0 ? 74 : 0} showInfo={false} /></div><em>{finished ? (index === 0 ? 'Pattern found' : index === 1 ? '18 months' : 'Matched') : 'Pending'}</em></div>)}<small>Demo simulation only: uploaded files are stored; no document contents are automatically interpreted.</small></section>;
}
export default DocumentScanPreview;
