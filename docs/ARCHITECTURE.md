# Architecture and boundaries

React/Vite browser → same-origin Express API → session/ownership checks → conversation orchestrator → Gemini structured tool decision → server policy executor → database transaction.

## Tool authority

`read_public_item`, `answer_from_facts`, `evaluate_offer`, `request_reservation`, and `request_clarification` are narrow operations. Gemini receives a whitelist of public listing data, confirmed facts, and recent conversation messages. The private price floor, seller notes, account email, and unshared contact field are excluded. Seller-authenticated editing endpoints necessarily return their own private settings; public and buyer endpoints do not.

The model selects fact IDs rather than composing arbitrary factual prose. The server copies matching seller-confirmed answers. Invalid calls and failed model requests escalate. This prevents invented output prose but does not guarantee semantic relevance: a model can choose the wrong existing fact. That still needs live evaluation. Seller-supplied facts can themselves be incorrect; the app labels their provenance.

The server checks price, quantity, explicit buyer terms, current status, and availability. Model output never approves a reservation or completes a sale. Pickup-only exceptions go to a human. The private floor is never disclosed directly; negotiation responses can still convey information about acceptable prices, as any bargaining process does.

Seller-only notes currently serve as private notes, not executable policies. Changes to supported rules belong in validated fields and code, not free-text instructions.

## Storage and transactions

SQLite is the zero-configuration local path. PostgreSQL is selected by `DATABASE_URL` and uses the same schema. Its transactions use serializable isolation with bounded retries for serialization failures and deadlocks. Schema bootstrapping is create-if-missing; use explicit migrations before changing a deployed schema.

Quantities satisfy `reserved + sold <= quantity`. Approval conditionally increments reserved stock, checks the current floor, then conditionally transitions a pending request. Conflicts roll back. Requests larger than remaining stock are closed. Completion moves reserved to sold once; only completed requests contribute to seller-reported proceeds. Seller-reported completion is not independently verified payment.

Message idempotency uses a per-user key, conversation/text fingerprint, and stored response inside the transaction. Per-conversation execution is serialized within one process. Deploy one API instance initially; test distributed message serialization and notification workers before horizontal scaling.

Photos are decoded, resized, stripped of metadata, and re-encoded to WebP. Files are limited to 8 MB and 25 million decoded pixels. Local files persist under `DATA_DIR`; S3 objects are private and returned through authorization-checked routes. Published listing photos are public. Draft and unattached uploads are owner-only.

## Accounts and privacy

Passwords use salted scrypt. Session tokens are random, stored as hashes, and issued in HTTP-only, SameSite cookies; production cookies require HTTPS. Mutations require the application header and a permitted Origin. Rate limits constrain authentication and messages. React renders user text as text rather than HTML.

Only the buyer and listing owner can read a conversation. Location is opt-in and rounded to two decimal places, but remains approximate public location information, not a privacy guarantee. Exact pickup instructions are public; use a public meeting place. Contact handoff is an explicit seller setting. Opted-in contact may consequently appear in the conversation and its subsequent model history.

Account deletion removes database rows by cascading relationships and then removes owned photo objects. Approved reservations must first be resolved. A cloud deletion failure can require operator cleanup. Listing deletion removes its conversations but does not remove reusable uploaded photo objects; account deletion removes those.

Expired sessions and message-idempotency entries are cleaned up. Notifications and closed-conversation messages age out after `RETENTION_DAYS` (default 90, minimum 7); active pending/approved conversations are retained. Listings, requests, seller answers, events, and reports remain until deletion. This is partial retention, not a blanket 90-day deletion promise.

## Integrations and operational limits

The dependency override pins Jayson 5 for the Solana SDK to avoid the older transitive dependency vulnerabilities. A local mock RPC test exercises its request path; a live devnet wallet test remains required.

Resend delivery is opt-in, uses a provider idempotency key, and retries while the durable inbox record remains. Initial deployment is a single process. No notification is sent unless a provider key is configured and the user opts in.

Solana verifies the devnet genesis hash, prepares an unsigned transfer with a reservation-specific reference, and checks destination, amount, reference, and transaction success. The buyer signs with their own wallet. CAD and test SOL are separate values. A failed confirmation requires recovery using the transaction signature; this flow needs a funded devnet wallet test before demonstration.

Reports are stored and buyers can be blocked. There is not yet a moderator console, email verification, password recovery, full GDPR-style export, production monitoring, or a complete abuse response process. Public listing search currently filters at most the 500 newest available listings. Do not describe this implementation as production-hardened or ready for unrestricted public traffic.

## Photo drafting

`src/components/create-item-wizard/PhotoDraft.tsx` owns the single-photo capture/upload/review flow. `POST /api/photo-drafts` verifies the authenticated user owns the photo, accepts one photo ID, and rate-limits generation. `server/drafts.ts` sends only that re-encoded image and the explicitly entered public context to Gemini. Private listing rules and account data are not read into this request.

AI output is schema-validated and returned as suggestions only. Extra model fields such as price, condition, listing status, or confirmed facts are discarded. The route never writes a listing. Seller-selected title/description/category fields are applied to the unsaved editor after explicit review; questions stay a checklist, not agent knowledge. A guided mode constructs a minimal draft solely from seller input and performs no image inference. Unknown image properties still require seller confirmation. Model restrictions reduce unsupported claims but do not replace reviewing the text.

Design reference: [Flippr's photo-first listing flow](https://useflippr.com/), adapted to one focal item and Encore's existing visual identity. Provider references: [image understanding](https://ai.google.dev/gemini-api/docs/image-understanding) and [structured output](https://ai.google.dev/gemini-api/docs/structured-output).
