import React, { useEffect, useState } from 'react';

const INTEGRATIONS = ['plaid', 'fingerprintjs', 'rapidapi_bureau', 'groq_copilot'];

const LABELS = {
  plaid: 'Plaid',
  fingerprintjs: 'FingerprintJS',
  rapidapi_bureau: 'RapidAPI Bureau',
  groq_copilot: 'Groq Copilot',
};

export default function IntegrationsPanel() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('nx_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/credit/integrations', { headers })
      .then((res) => {
        if (!res.ok) throw new Error('bad status');
        return res.json();
      })
      .then((data) => {
        setStatus(data);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  const offline = error || !status;

  const rows = INTEGRATIONS.map((key) => {
    const entry = status ? status[key] : null;
    const connected = entry ? entry.connected : false;
    const note = offline
      ? 'backend offline'
      : entry && entry.note
      ? entry.note
      : '';
    return { key, connected, note };
  });

  return (
    <div className="nx-card">
      <header className="nx-card-head">
        <h3>Connected integrations</h3>
        <span className="nx-sub">live data sources and agent tooling</span>
      </header>
      <div className="nx-card-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {rows.map((row) => (
            <div
              key={row.key}
              style={{
                background: 'var(--nx-surface-2)',
                border: '1px solid var(--nx-line)',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--nx-ink)' }}>{LABELS[row.key]}</span>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: row.connected ? '#22c55e' : '#9ca3af',
                    boxShadow: row.connected ? '0 0 0 4px #dcfce7' : 'none',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.06em',
                  color: row.connected ? '#16a34a' : '#8a97a6',
                }}
              >
                {row.connected ? 'CONNECTED' : 'MOCK / NOT CONFIGURED'}
              </span>
              {row.note && <span style={{ fontSize: 12, color: 'var(--nx-body)' }}>{row.note}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
