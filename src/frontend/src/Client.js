const BASE = '/api';

function authHeaders(extra = {}) {
  const token = localStorage.getItem('nx_token');
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function handle(res) {
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch (e) { /* ignore */ }
    throw new Error(`${res.status} ${res.statusText}${detail ? ' — ' + detail : ''}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function jsonRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...authHeaders(options.headers || {}) };
  return handle(await fetch(`${BASE}${path}`, { ...options, headers }));
}

/* Raw fetch (returns the Response) for callers that parse it themselves. */
async function rawRequest(path) {
  return fetch(`${BASE}${path}`, { headers: authHeaders() });
}

/* Auth (demo auto-login in App.js) */
export const login = (username, password) =>
  jsonRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const setAuthToken = token => { if (token) localStorage.setItem('nx_token', token); };

/* Portfolio */
export const getApplications = () => jsonRequest('/credit/applications');
export const getApplication = id => jsonRequest(`/credit/applications/${id}`);
export const createApplication = body => jsonRequest('/credit/applications', { method: 'POST', body: JSON.stringify(body) });
export const getCreditApplications = () => rawRequest('/credit/applications');
export const getDecision = id => jsonRequest(`/credit/applications/${id}/decision`);
export const getDecisionTrace = id => jsonRequest(`/credit/applications/${id}/decision/trace`);
export const getExplanations = id => jsonRequest(`/credit/applications/${id}/explanations`);
export const getFairnessMetrics = () => jsonRequest('/credit/fairness/metrics');

/* Model + evidence */
export const getModelCard = () => jsonRequest('/credit/model');
export const getIntegrations = () => jsonRequest('/credit/integrations');
export const getEvidenceCatalog = () => jsonRequest('/credit/evidence/catalog');
export const searchEvidence = (query, topK = 5) =>
  jsonRequest('/credit/evidence/search', { method: 'POST', body: JSON.stringify({ query, k: topK }) });

/* Cash-flow intelligence */
export const getCashflowFeatures = id => jsonRequest(`/credit/applications/${id}/cashflow-features`);
export const ingestTransactions = id => jsonRequest(`/credit/applications/${id}/transactions/ingest?provider=local`, { method: 'POST' });
export const simulateAdverseEvent = (id, eventType) =>
  jsonRequest(`/credit/applications/${id}/transactions/adverse-event?kind=${encodeURIComponent(eventType)}`, { method: 'POST' });

/* Simulation / model introspection */
export const simulateProfile = body => jsonRequest('/credit/simulate', { method: 'POST', body: JSON.stringify(body) });
export const getSchema = () => jsonRequest('/credit/schema');
export const healthCheck = () => jsonRequest('/health');

/* Audit */
export const getAuditLogs = () => rawRequest('/audit/logs');

/* Underwriting studio (CreditApplicationForm) */
export const analyzeCreditApplication = application => jsonRequest('/credit/analyze', { method: 'POST', body: JSON.stringify(application) });
export const uploadCreditDocument = (applicationId, file) => {
  const form = new FormData();
  form.append('applicationId', applicationId);
  form.append('file', file);
  return fetch(`${BASE}/credit/upload`, { method: 'POST', headers: authHeaders(), body: form }).then(handle);
};
export const explainDecision = application => jsonRequest('/credit/explanation', { method: 'POST', body: JSON.stringify(application) });
export const reanalyzeApplication = applicationId => jsonRequest(`/credit/applications/${applicationId}/reanalyze`, { method: 'POST' });
export const askCopilot = (applicationId, question) =>
  jsonRequest('/credit/copilot', { method: 'POST', body: JSON.stringify({ applicationId, question }) });
export const reviewCreditApplication = (id, decision, note) =>
  jsonRequest(`/credit/review/${id}`, { method: 'POST', body: JSON.stringify({ decision, reviewerNotes: note }) });
