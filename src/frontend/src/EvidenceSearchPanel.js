import { useState } from 'react';
import { Alert, Button, Card, Empty, Input, InputNumber, List, Tag, Typography } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import { searchEvidence } from './Client';
import { errorNotification } from './Notification';

const { Text, Paragraph } = Typography;

function EvidenceSearchPanel({ proofType }) {
  const [query, setQuery] = useState('income proof');
  const [k, setK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    searchEvidence(query.trim(), k)
      .then(setResult)
      .catch(() => {
        setError('Search could not be completed. Confirm the backend is running and the evidence endpoint is reachable.');
        errorNotification('Evidence search failed', 'Check the backend connection.');
      })
      .finally(() => setLoading(false));
  };

  return <Card id="evidence-search" title={<><FileSearchOutlined /> Semantic document search</>} extra={<Tag color={result ? (result.semanticSearchAvailable ? 'green' : 'default') : 'default'}>{result ? (result.semanticSearchAvailable ? 'Vector search ON' : 'Vector search OFF') : 'status'}</Tag>}>
    <p>Search the document evidence store for signals that support an underwriting decision.</p>
    <Input.Group compact style={{ display: 'flex', marginBottom: 12 }}>
      <Input style={{ flex: 1 }} placeholder="Search query, e.g. income proof" value={query} onChange={event => setQuery(event.target.value)} onPressEnter={runSearch} />
      <InputNumber min={1} max={10} value={k} onChange={value => setK(value || 1)} style={{ width: 90 }} addonAfter="k" />
      <Button type="primary" loading={loading} onClick={runSearch}>Search</Button>
    </Input.Group>
    {error && <Alert type="error" showIcon message={error} />}
    {proofType && <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>Filtering the evidence corpus for {proofType.replaceAll('_', ' ')} proof.</Text>}
    {result && !error && (
      result.results?.length ? (
        <List
          dataSource={result.results}
          renderItem={item => <List.Item>
            <List.Item.Meta
              title={item.source || `Result #${item.id}`}
              description={<>
                <Tag>{item.type}</Tag><Text type="secondary">score {typeof item.score === 'number' ? item.score.toFixed(2) : item.score}</Text>
                <Paragraph style={{ marginTop: 6 }} ellipsis={{ rows: 3 }}>{item.content}</Paragraph>
              </>}
            />
          </List.Item>}
        />
      ) : <Empty description="No matching evidence returned" />
    )}
    {result && !result.semanticSearchAvailable && (
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
        Lexical match (embeddings disabled)
      </Text>
    )}
  </Card>;
}

export default EvidenceSearchPanel;
