# Repository guide

This repository is the canonical NexCredit AI implementation for Synchrony Hackathon Problem Statement 3. The project is intentionally organized by responsibility so a reviewer can move from the product surface to the API, decision policy, data layer, and tests without searching through generated files.

## Top-level map

```text
NexCredit-AI/
├── src/main/java/com/synchrony/nexcredit/   Spring Boot API
│   ├── credit/                               Applications, underwriting, review, evidence, audit
│   ├── ai/                                   Embeddings, vector retrieval, optional explanation adapter
│   └── security/                             JWT authentication and role configuration
├── src/main/resources/                       Runtime configuration and database settings
├── src/test/java/com/synchrony/nexcredit/   Backend unit and controller tests
├── src/frontend/src/                         React workbench and reusable UI components
├── docs/                                     Architecture, evidence, screenshots, and project notes
├── submission/SE23UCSE065/                   Roll-numbered report source and demo input
├── build-submission.sh                       Validated PDF/video/source packaging script
├── Dockerfile + docker-compose.yml           Containerized deployment path
└── README.md                                 Reviewer entry point
```

## Where to start

1. `README.md` — product purpose, architecture, API surface, setup, and truthfulness boundaries.
2. `src/frontend/src/App.js` — application shell, authentication, API health, and workspace state.
3. `src/frontend/src/WorkspacePages.js` — Command Center, Underwriting Studio, Evidence Intelligence, Review & Governance, and Platform Architecture.
4. `src/main/java/com/synchrony/nexcredit/credit/CreditUnderwritingService.java` — deterministic decision policy, confidence, fraud-risk routing, and bias guardrail.
5. `src/main/java/com/synchrony/nexcredit/credit/CreditController.java` — REST entry points for application, review, upload, evidence, and explanation flows.
6. `src/main/java/com/synchrony/nexcredit/ai/VectorStore.java` — pgvector retrieval with deterministic text fallback.
7. `src/test/java/com/synchrony/nexcredit/credit/` — policy, review, upload, evidence, and controller coverage.

## Runtime ownership

The React client owns presentation and workflow navigation. Spring Boot owns validation, authentication, underwriting, review transitions, document extraction, evidence retrieval, and audit writes. PostgreSQL owns durable application, evidence, and audit records. The optional remote AI adapter is disabled by default; deterministic local behavior remains the demo path.

## Submission hygiene

Generated `target/`, `build/`, `node_modules/`, `uploads/`, `.env`, and ZIP/PDF artifacts are excluded from normal Git history. Run `bash build-submission.sh` only when the real roll-numbered MP4 exists in `submission/SE23UCSE065/`; the script validates the video and excludes secrets and build output from the archive.
