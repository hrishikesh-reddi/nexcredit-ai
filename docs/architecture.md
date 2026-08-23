# NexCredit AI Architecture

```text
[React / Ant Design]
  Dashboard · New Application · Review Queue · Audit Trail
               |
               | REST / JSON and multipart upload
               v
[Spring Boot API]
  CreditController -> CreditUnderwritingService -> CreditApplicationRepository
                       |                            |
 and -> AuditLogService ----------+
 and -> bias/review policy
               |
               v
[PostgreSQL]
  credit_applications · audit_logs
```

## Decision lifecycle

1. Validate required applicant fields and score ranges.
2. Persist the applicant profile and calculate decision, confidence, fraud risk, and a human-readable explanation.
3. Apply the age-sensitive guardrail and review-queue policy.
4. Persist a linked audit event.
5. Return the application ID and result to the React dashboard.

## Security and data boundaries

- Input validation is supplied through Jakarta validation annotations and upload filenames are normalised.
- Supporting documents are limited to 10 MB, kept outside version control, and parsed locally with Apache Tika into a bounded text preview for reviewer evidence. Extracted text cannot automatically change a credit decision.
- Docker credentials come from `.env`, which is ignored by Git; use `.env.example` only as a template.
- Authentication, production secrets management, encryption at rest, and consent capture are intentional next-step requirements before deployment.
