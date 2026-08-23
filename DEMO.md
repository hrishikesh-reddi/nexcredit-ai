# NexCreditAI — Demo Runbook

Everything needed to present a reliable, end-to-end underwriting demo.
Every number shown is computed from data: raw transactions → cash-flow features → Home-Credit-trained PD model → deterministic policy/fraud rules → decision + reasons.

---

## 1. Start everything (3 terminals, or use tmux)

```bash
# 1) PostgreSQL (Homebrew service; DB creditdb must exist)
brew services start postgresql@16
psql -h localhost -U "$USER" -d postgres -c "CREATE DATABASE creditdb;"   # first time only

# 2) Backend on :8081  (ML model trains at startup on 6,000 real Home Credit rows)
NEXCREDIT_ML_ENABLED=true ./mvnw -P'!bundle-backend-and-frontend' spring-boot:run

# 3) Frontend on :3000 (auto-falls back to :3001 if occupied)
cd src/frontend && npm install && npm start
```

Open **http://localhost:3000** (or :3001). The app auto-logs-in as the demo underwriter.

Demo users (local dev): `underwriter/underwriter123` · `admin/admin123` · `applicant/applicant123`

Health checks:
- API: http://localhost:8081/api/health
- Model card + holdout metrics: http://localhost:8081/api/credit/model

## 2. The three demo applicants (seeded automatically on an empty DB)

| Scenario | Applicant | Story | Outcome (computed) |
| --- | --- | --- | --- |
| **A** | **Aarav Mehta** (#37) | Thin-file gig worker, healthy 6-month cash-flow: salary detected ~₹45k/mo at 98% regularity, +₹11.7k monthly surplus, zero suspicious events | ✅ **APPROVED**, confidence 96%, grade A |
| **B** | **Meera Iyer** (#38) | Self-employed, lumpy freelance income, heavy EMIs, outflows exceed inflows (~−₹15k/mo deficit), returned NACH mandate | ⚠️ **MANUAL REVIEW** — cash-flow deficit rule forces human review |
| **C** | **Vikram Rathore** (#39) | Declares ₹83k/mo income but statement shows recurring salary of only ~₹48k; gambling loads, ₹30k round UPI transfers, post-salary ATM cash-outs | 🚩 **FRAUD FLAG / MANUAL REVIEW** — fraud risk HIGH |

> These outcomes are **not scripted**: wipe the database and restart — the pipeline re-derives them from raw transactions every time.

Reset demo state:
```bash
psql -h localhost -U "$USER" -d creditdb -c "TRUNCATE credit_applications, audit_logs RESTART IDENTITY CASCADE;"
# then restart the backend — seeds re-run through the full pipeline
```

## 3. Recommended click path (10–12 min)

1. **Landing page** — one-liner: "Underwriting for people the bureau can't see."
2. **Open live workbench → Command Center** — portfolio KPIs, all computed live from the application set.
3. **Underwriting Studio** — select **Aarav Mehta** row.
4. Scroll to **Cash-flow intelligence** panel:
   - Applicant: Aarav · Persona: *A · Thin-file, healthy cash-flow* → **Connect & analyze 6-month statement**
   - Narrate the feature cards: *"66 transactions analysed. Salary detected ₹44,943/month at 98% regularity. Surplus +₹11,673. Zero anomalies."*
   - Point at derivation notes: every figure is re-derivable from raw transactions — auditable by construction.
5. **Live adverse-event simulation** (the money moment):
   - Click **Gambling spike** → BEFORE/AFTER table recomputes: surplus drops, volatility jumps, suspicious txns ≥3 → **APPROVED 96% flips to MANUAL REVIEW**, credit limit withdrawn pending review.
   - *"This is proactive contextual decisioning: new financial behaviour instantly re-runs the entire pipeline."*
6. Select **Meera Iyer** in the portfolio — show her MANUAL REVIEW and the reason codes / policy tags (`CASH-FLOW DEFICIT`, affordability strain).
7. **Evidence Intelligence** — semantic search over uploaded documents (pgvector when available).
8. **Review & Governance** — approve/override Meera as the human underwriter; audit trail updates live with model version + reasoning per decision.
9. **Platform Architecture** — responsible-AI posture: LLM explains, never decides.

### Optional API walkthrough (curl)
```bash
TOKEN=$(curl -s -X POST localhost:8081/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"underwriter","password":"underwriter123"}' | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')

# Ingest persona C into Vikram's application and see the fraud-flagged re-decision
curl -s -X POST "localhost:8081/api/credit/applications/39/transactions/ingest?provider=local&persona=suspicious-inconsistency" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Adverse event before/after
curl -s -X POST "localhost:8081/api/credit/applications/37/transactions/adverse-event?kind=NEW_EMI_BURDEN" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```
Adverse-event kinds: `GAMBLING_SPIKE`, `POST_SALARY_CASH_OUT`, `NEW_EMI_BURDEN`, `ROUND_TRANSFER_BURST`.

## 4. Architecture in one line per stage

```
Applicant data
→ Transaction ingestion (Plaid Sandbox or deterministic personas)
→ Cash-flow feature extraction (salary detection, regularity, surplus, volatility, obligations, anomalies)
→ Hybrid PD model (logistic regression trained on 6,000 real Home Credit applications
   + behavioural alternative-data block; age excluded as protected attribute)
→ Deterministic policy/fraud rules (affordability caps, liquidity stress, anomaly gates, bias guardrail)
→ Decision + reason codes + recommended limit
→ LLM explanation / reviewer copilot (explanation ONLY — never decides)
→ Audit log (who/when/what, model version recorded)
```

Model transparency: `GET /api/credit/model` returns weights, holdout AUC/accuracy/F1, fairness note, benchmark vs rule-based approvals.

## 5. Plaid Sandbox (optional upgrade)

Set env vars before starting the backend — no code change needed:
```
PLAID_CLIENT_ID=...      # free at dashboard.plaid.com
PLAID_SECRET=...
```
`GET /api/credit/integrations` then reports `plaid-sandbox: true`, and the ingest endpoint accepts `provider=plaid`.
Without credentials the app uses deterministic local personas — identical downstream pipeline.

## 6. Known limitations (say these proactively if asked)

- Alternative-data behavioural block is trained via outcome-conditioned simulation layered on the real Home Credit sample (documented in the model card); it demonstrates the fusion architecture, not production calibration.
- Local persona provider generates synthetic-but-realistic statements so demos never depend on external credentials; swap to Plaid/AA by configuration.
- LLM explanations require an API key (`NEXCREDIT_AI_ENABLED=true` + `OPENAI_API_KEY`); without one, explanations fall back to deterministic rule-based text.
- pgvector semantic search requires the Docker Postgres image; otherwise token-overlap search fallback is used.
