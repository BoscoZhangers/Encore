# Encore — accepted build direction

Brand: Encore. Tagline: **Good things deserve another chapter.** Earlier working notes sometimes said SecondLife; the selected name is Encore throughout this implementation.

## Product

Help regular people sell secondhand items without spending their day answering messages. Start with campus electronics and furniture, with shareable listings before marketplace discovery has enough traffic. Target 10–20 consenting testers; this is a recruitment target, not an existing user count.

Core loop: **list → answer → negotiate → escalate uncertainty → seller confirms reservation → mark sold**. Buyer text cannot authorize rule changes. The assistant answers from confirmed public knowledge, negotiates inside seller boundaries, and asks the seller instead of inventing missing details. Contact disclosure is an explicit per-listing choice.

## Implementation stages

1. Interactive product: responsive seller workspace, listing editor/photos, buyer conversations, price boundaries, seller questions, reusable facts, reservations, sale status, activity, persistence. The original browser-local prototype milestone has been superseded here by a local server and durable SQLite database with separate accounts; data is not in localStorage.
2. Private backend and agent: authentication, ownership, isolated conversations, Gemini tool calls, private policy service, recoverable model failures, transactional inventory and idempotent messages.
3. Pilot: shareable links, object storage adapter, notifications, optional contact disclosure. Validate onboarding and negotiations with a small consenting cohort before growth.
4. Marketplace and evaluation: search/category/price/area/proximity filters, multiple quantities, available/reserved/sold inventory, reporting, versioned evaluations, outcome analytics, technical write-up.

## Sponsor direction

Gemini: structured understanding and tool selection. Tiger Data: relational listings, conversations, and timestamped outcomes. Vultr: application hosting and object storage. Solana: buyer-approved devnet test transaction after seller approval. GoDaddy/DEV: possible domain and write-up. Adapters are not proof of sponsor use; document actual use before submitting to those tracks. Prize eligibility has not been rechecked as part of implementation.

## Evaluation and honest metrics

Keep development and evaluation cases separate. Include known/unknown facts, ambiguous offers, attempts to reveal instructions, unsupported delivery, unavailable stock, concurrency, and handoff failures. Evaluate grounding, escalation, rule violations, leakage, completion, latency, and cost. Compare prompt-only against retrieval plus enforced tools in a later experiment. Add photo-assisted drafts only after the text workflow is reliable and measure seller corrections.

Pilot metrics to add: activation, preparation time, factual corrections, conversation resolution without intervention, escalation quality and response time, accepted reservations, completed sales, seller proceeds, repeat sellers, and referrals. Current event counts are a starting point; they do not establish those full metrics or environmental impact.

## Exclusions

No price matching, purchase tracking, unrelated finance assistant, real automated payments, escrow, shipping, third-party marketplace outreach, inferred condition claims, carbon estimates, or automatic disclosure of account contact details. Devnet test tokens do not settle a CAD purchase. No real-user, revenue, or carbon claims based on seeded data.

## Photo drafting priority

At the owner's request, the single-item photo-to-draft experience was moved ahead of third-party activation. Capture, upload, review, manual starter mode, and the Gemini vision adapter are implemented. Actual image recognition still requires a configured key and live evaluation; condition, pricing, and confirmed agent facts remain seller-controlled.
