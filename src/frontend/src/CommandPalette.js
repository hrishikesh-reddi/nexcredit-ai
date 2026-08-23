import { useMemo, useState } from 'react';
import { Input, List, Modal, Tag } from 'antd';
import { AppstoreOutlined, AuditOutlined, FileSearchOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';

const pages = [
  { label: 'Command Center', icon: <AppstoreOutlined /> },
  { label: 'Underwriting Studio', icon: <FileSearchOutlined /> },
  { label: 'Evidence Intelligence', icon: <FileSearchOutlined /> },
  { label: 'Review & Governance', icon: <SafetyCertificateOutlined /> },
  { label: 'Platform Architecture', icon: <AuditOutlined /> },
];

export default function CommandPalette({ open, onClose, applications, onNavigate, onOpenDetail }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pageHits = pages.filter(p => !q || p.label.toLowerCase().includes(q)).map(p => ({ type: 'page', ...p }));
    const appHits = (applications || [])
      .filter(a => !q || a.applicantName?.toLowerCase().includes(q) || String(a.id) === q)
      .slice(0, 6)
      .map(a => ({ type: 'app', label: a.applicantName, sub: `${a.employmentType?.replaceAll('_', ' ')} · ${a.creditDecision || 'PENDING'}`, icon: <UserOutlined />, app: a }));
    return [...pageHits, ...appHits];
  }, [query, applications]);

  const choose = item => {
    if (item.type === 'page') onNavigate(item.label);
    else onOpenDetail(item.app);
    onClose();
  };

  return <Modal open={open} onCancel={onClose} footer={null} title={null} className="cmdk-modal" destroyOnClose>
    <Input
      autoFocus
      placeholder="Jump to a workspace or search an applicant…"
      value={query}
      onChange={event => setQuery(event.target.value)}
      prefix={<FileSearchOutlined />}
      className="cmdk-input"
    />
    <List
      className="cmdk-list"
      dataSource={results}
      locale={{ emptyText: 'No matches' }}
      renderItem={item => (
        <List.Item className="cmdk-item" onClick={() => choose(item)}>
          <span className="cmdk-item-icon">{item.icon}</span>
          <span className="cmdk-item-label">{item.label}</span>
          {item.sub && <Tag className="cmdk-item-sub">{item.sub}</Tag>}
          {item.type === 'page' && <span className="cmdk-item-meta">Workspace</span>}
        </List.Item>
      )}
    />
    <div className="cmdk-foot"><kbd>↑</kbd><kbd>↓</kbd> navigate · <kbd>↵</kbd> open · <kbd>esc</kbd> close</div>
  </Modal>;
}
