# Backend structure

- `index.ts` starts the service and performs startup maintenance.
- `app.ts` assembles the HTTP API and route handlers.
- `domain.ts` contains shared validation, authorization-sensitive listing transforms, reservation transitions, notifications, and events.
- `agent.ts` contains Cora’s decision schema, local fallback, model boundary, and enforced tool execution.
- `db.ts` owns versioned schema migrations and the SQLite/Postgres query abstraction.
- `drafts.ts` owns guided and model-assisted photo drafting.
- `messageReads.ts` owns unread-message calculations and acknowledgements.
- `notifications.ts` owns optional email delivery.
- `payments.ts` owns Solana devnet payment intents and verification.
- `storage.ts` owns local and object-storage photo persistence.

Keep private pricing rules, ownership checks, transactional state changes, and authorization in server code. Route handlers should call narrow domain functions rather than exposing those rules to the client or model context.
