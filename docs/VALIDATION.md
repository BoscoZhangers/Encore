# Validation record

This record distinguishes executable local checks from work that requires configured external services.

## Automated local checks

The current public source passes:

- 49 API, domain, integration, and simulated UI tests.
- All 12 deterministic policy evaluation scenarios, with no private-canary leaks or policy violations.
- TypeScript checking and the Vite production build.
- Prettier formatting checks.
- Production dependency audit with zero known vulnerabilities.

The test suite covers authentication and ownership, public/private data separation, grounded answers, seller handoffs, negotiation boundaries, idempotency, competing reservations, inventory accounting, completed-sale proceeds, contact opt-in, blocking, reporting, photo access, listing views, unread messages, marketplace filtering, seller insights, the listing wizard, and Solana devnet intent validation against a mocked RPC service.

Gemini request construction, schema validation, recoverable failures, and photo-draft boundaries are covered with mocked model responses. Live smoke tests also confirmed an authenticated Gemini conversation tool call and a structured single-photo listing draft. A burst evaluation reached the API project's request limit and safely escalated affected messages without private-data leakage or policy violations. The default repeatable evaluation still measures deterministic rules mode and is not a claim about model accuracy.

## Still requires external validation

- Larger live Gemini quality, latency, cost, quota, and held-out evaluation runs.
- Tiger Data/PostgreSQL integration and multi-process concurrency.
- Real S3-compatible upload/deletion and Resend delivery.
- A funded Phantom devnet transaction and confirmation recovery.
- Docker deployment, HTTPS, production backups, monitoring, and restore testing.
- Physical camera testing and broader browser, accessibility, and responsive-layout QA.
- Consenting real-user onboarding and pilot metrics.

Seeded listings and accounts are fictional. There are no measured real users, independently verified sales, revenue, or environmental-impact results in this repository.
