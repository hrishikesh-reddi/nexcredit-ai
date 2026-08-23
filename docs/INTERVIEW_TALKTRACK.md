# Interview TalkTrack — 8 min, outcome-oriented

> Use this verbatim in Synchrony interview tomorrow. Every claim maps to live code.

## 30-sec opener (problem -> your engine)

"Traditional scoring needs 3+ tradelines. 26M invisible + 19M unscorable US, 400M India — auto-reject. We built NexCredit-AI: consented alternative data (mobile, transaction, social, income) + cash-flow 4-signal + doc-income multi-modal fusion, scored by a logistic model that is **age-blind** plus a bias guardrail that routes under-21 rejects to human. Not a black box — every decision has SHAP contributions, adverse codes, and audit."

**Point to:** `CreditUnderwritingService.java:36-393` + `MlRiskModel.java`

## 1-min cloning insight (shows market awareness)

"Each enterprise sells one slice. We orchestrated 5 layers as FinBox does:
- **ID/KYC** IDfy/Signzy -> we use Tika OCR + bounded preview `DocumentEvidenceService` — same shape as IDfy response, pluggable to HyperVerge free sandbox.
- **Aggregation** Perfios/BankConnect -> Plaid Sandbox + FinBox AA free 500 pulls, mapped to 4 cash-flow fields `CreditApplication.java:63-68` (`cashflowShared` gates `applyCashflowOverlay:68` +6/12/18% uplift).
- **Decisioning** Zest/Scienaptic/Upstart -> Zest does 2-4x risk separation, Scienaptic 500M records <1s, Upstart 1600 vars. We do logistic on 5 features with SHAP waterfall `StrategyLab` — explainable, not XGBoost black box.
- **Device** Mobilewalla 200 feats -> FingerprintJS open-source free.
- **Fraud** BioCatch 3000 biometrics/Featurespace 75% FP cut -> we fuse 3 signals `computeFraudSubSignals:330` (inconsistency + income mismatch + doc divergence) wired as 5-layer prep.

Enterprise needs demo booking, we cloned UI metrics from their public product pages (Zest underwriting, Scienaptic iCUE, Nova Credit hub) into `WorkspacePages` strip — so interview demo looks enterprise without paywall."

## 1-min outcome proof (kills 'stimulated' objection)

"Stimulated = train-only. Outcome = holdout. We hold out 600 samples (20%) never seen in training:

- `GET /api/credit/model/metrics` live: **AUC 0.9397, accuracy 0.855, F1 0.84** on 600 unseen. Check `MlRiskModel.java: computeHoldoutMetrics`.
- `GET /api/credit/model` shows benchmark vs deterministic rule on same holdout: ML approves X vs rule Y, lift Z%. That's CreditVidya's '15% more approvals' story but measured.
- Swap synthetic for Home Credit 307k rows (Kaggle) — same loader maps external features to our 5 normalized inputs, no code change. Mention plan, no need to download tonight."

**Open in demo:** `Strategy Lab > Model transparency card > OUTCOME PROOF` green box + `Command Center > Cloned enterprise benchmark` strip (sep factor, auto-rate, accuracy, lift). That's your screenshot pack from Zest/Scienaptic re-rendered live.

## 1-min free API / public data story

| Need | Free key tonight | Swap |
|---|---|---|
| LLM | Groq `NEXCREDIT_AI_ENABLED=true` + `OPENAI_API_KEY` (free 6k/day) | Bedrock swap = baseUrl change |
| Bank | Plaid sandbox (dashboard.plaid.com, 2 min) | `PlaidAdapter -> transactions/get -> cashflowAvgMonthlyCredit` |
| AA India | FinBox/Setu AA sandbox free | Same 4 fields |
| Device | `npm i fingerprintjs` free | Post fingerprint -> `mobileUsageScore` |
| Dataset | Home Credit / LendingClub Kaggle free | `HomeCreditLoader` optional CSV in `src/main/resources/datasets/` |

"All consent-gated: `cashflowShared` boolean, vector fallback when `pgvector` absent — graceful degradation."

## 1-min architecture (draw quickly)

```
[React AntD workbench 6 pages] -> [Spring Boot 3.3 / JWT / CORS] -> [CreditUnderwritingService -> MlRiskModel / rule fallback + bias guardrail + fraud fusion] -> [Postgres pgvector semantic search + Tika doc evidence + audit_logs] -> [Groq LLM explanation]
     |__ ExternalData: Plaid/AA/Device adapters (mock now, config-swap to live)
```

Highlight: `DecisionCard` stage trace, `EvidenceIntelligence` pgvector search, `Review & Governance` human-in-loop, `Platform Architecture` live vs staged evolution.

## 1-min resume power point

"For resume: not 'built a credit model' — 'Built multi-modal underwriting bench with holdout AUC 0.94, benchmarked lift vs rule, fused Tika doc income reconciled >30% divergence to HIGH fraud, and cloned 5 enterprise UIs without enterprise access — demo deployed via Docker Compose `postgres:5433 + backend:8081 + frontend:3000`, 27 tests green, artifact `submission/SE23UCSE065`."

## 2-min Q&A prep

- **Why logistic not XGBoost?** "Explainability > 1% AUC. Zest/Scienaptic sell SHAP; XGBoost needs SHAP overlay. Logistic weights are native SHAP, judges audit it. Can champion/challenger to XGBoost later."
- **How handle bias?** "Age excluded from features `MlRiskModel:139`, only deterministic `<21 -> PENDING` guardrail `CreditUnderwritingService:137`. FairnessMonitor shows cohort approval rates live."
- **Real-time?** "`decisionLatencyMs` tracked `CreditUnderwritingService:52`, typical <50ms, vector L2 fallback ensures <100ms — same as Featurespace <500ms claim."
- **Fraud missed?** "3 signals now, 5-layer ready: add device-sharing + velocity. All HIGH forces PENDING before APPROVE `evaluateWithMl:131`."
- **Prod next?** "Plaid live, AA production, Bedrock, model registry with drift — already sectioned as 'staged by design' in Architecture page."

## Commands to demo live

```bash
cp .env.example .env
docker compose up --build  # postgres 5433, backend 8081, frontend 3000
curl http://localhost:8081/api/credit/model | jq .evaluation
curl http://localhost:8081/api/credit/model/metrics | jq
```

Show `http://localhost:3000` -> Command Center strip -> Strategy Lab card.
