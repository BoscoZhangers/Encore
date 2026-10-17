# Encore

**Good things deserve another chapter.**

A secondhand marketplace with a seller-controlled conversation assistant. List an item, answer from confirmed facts, negotiate within private price boundaries, and bring a human in when something is uncertain. Sellers approve reservations and record completed sales.

## Run locally

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
cp .env.example .env
npm run seed   # optional: fictional listings and two local demo accounts
npm run dev
```

If macOS has offloaded the Desktop repo to cloud storage, make it fully available locally before installing dependencies, or use a working copy outside a synced folder.

Open **http://127.0.0.1:5173**. The API runs on port 3001. SQLite and uploaded images persist in `data/`, which is excluded from Git. No cloud accounts are required for this local mode.

| Demo role | Email              | Password        |
| --------- | ------------------ | --------------- |
| Seller    | seller@encore.demo | EncoreDemo2026! |
| Buyer     | buyer@encore.demo  | EncoreDemo2026! |

These accounts only exist after running the seed command. Use two browser profiles, or one normal and one private window, to demonstrate both sides. Never seed a public deployment. All eight seeded listings are fictional.

## What works

- Seller and buyer accounts with opaque, HTTP-only cookie sessions and private ownership checks.
- Create, edit, publish, pause, and share listings; upload up to five photos; set a private minimum, confirmed answers, quantities, and pickup terms.
- Browse and filter by text, category, price, neighborhood, or approximate proximity.
- Separate conversations for each buyer. Offers below the floor receive a counter; unknown facts and exceptions become seller questions.
- Reply through the seller inbox and explicitly choose whether to reuse the answer.
- Approve reservations transactionally, close competing requests that exceed remaining inventory, cancel to release stock, and mark sales complete.
- Seller-reported proceeds, event counts, in-app notifications, optional email delivery, buyer blocking, listing reports, and account deletion.
- Optional Gemini tool selection, PostgreSQL/Tiger Data, S3-compatible image storage, and buyer-approved Solana **devnet** test payments.

Without a Gemini key, the assistant uses conservative deterministic rules, and the conversation header says AI is not connected. Exact saved questions work; unfamiliar phrasing usually goes to the seller. The app never pretends that rules mode is a live model.

## Photo-to-draft listing flow

Open **Sell an item** to start with a snapshot. Take one photo with the device camera, upload one image, or drop one image into the capture panel. You can add further views of the same item in the existing photo editor afterward.

- With Gemini configured, **Generate draft from photo** sends the selected image and optional seller notes to the model. It suggests a title, category, description, visible details to check, and seller questions. Multiple focal sale items or an unclear image trigger a retake request.
- Without a key, **Create starter draft** uses only the item name and notes the seller types. It is explicitly labeled as a non-AI starter; it does not identify or analyze the image.
- Review and edit the suggestions, select which fields to apply, and acknowledge review. Applying a draft does not save or publish the listing and never changes prices, private terms, condition, or confirmed agent knowledge. New listings require the seller to choose a condition.
- `GEMINI_MODEL` selects the conversation model and `GEMINI_VISION_MODEL` can select a separate photo model. The example configuration uses Flash-Lite for frequent conversation decisions and Gemini 3.8 Flash for richer image understanding.

Camera capture requires a secure context (HTTPS or localhost) and permission. Upload remains available when camera access is denied. Supported uploads: JPG, PNG, WebP, up to 8 MB.

## Connect services

Edit `.env`; keep credentials out of Git and the browser bundle.

| Integration               | Environment settings                                                                   | Current behavior                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Gemini                    | `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_VISION_MODEL`                                | Chooses one structured tool from public facts and drafts listing text from one item photo. Failures become seller handoffs.                 |
| Tiger Data / PostgreSQL   | `DATABASE_URL`                                                                         | Uses PostgreSQL instead of local SQLite. Use the provider's TLS connection string.                                                          |
| S3 / Vultr Object Storage | `S3_BUCKET`, `S3_ENDPOINT`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Private bucket objects served through access-checked API routes.                                                                            |
| Resend email              | `RESEND_API_KEY`, `NOTIFICATION_FROM`                                                  | Optional notifications for users who opt in. In-app notifications work without it.                                                          |
| Solana devnet             | `SOLANA_DEVNET_RPC`                                                                    | Seller sets a receiving wallet and test-SOL amount. Buyer approves in Phantom after reservation approval. No real CAD settlement or escrow. |

These adapters are implemented; live service credentials and a public deployment are not included. Private notes are stored for the seller and are deliberately **not** sent to the model; only explicitly confirmed public facts guide answers.

## Verify

```sh
npm test
npm run eval
npm run build
npm run format:check
```

The API tests cover authorization, private data, grounding, handoffs, contact opt-in, duplicate actions, and inventory. The separate 12-case evaluation exercises tool selection and policy outcomes. Its default output measures **rules mode**, not ML performance.

```sh
npm run eval -- --dev       # development examples
npm run eval -- --gemini    # live model, requires a key and incurs API usage
```

The live-model run is opt-in. Prompt-only comparison, model costs, a larger held-out dataset, and real pilot metrics remain future work. Do not quote the synthetic rules pass rate as model accuracy or user traction.

## Demo sequence

1. As the seller, inspect the headphones listing: CAD 180 asking price, private CAD 150 minimum, one unit.
2. As the buyer, open its shareable page and chat. Ask **“Is the case included?”**
3. Offer CAD 120. The assistant counters without naming the minimum or reserving stock.
4. Ask **“How long does the battery last?”** The assistant asks the seller.
5. In the seller inbox, answer **“I have not measured it recently.”** and enable answer reuse. Repeat the question as the buyer.
6. Offer CAD 165. The seller approves the pending reservation; inventory becomes reserved.
7. The seller marks the exchange complete. Only now do seller-reported proceeds increase.

## Deploy

`npm run build && npm start` serves the built frontend and API together. See [deployment instructions](docs/DEPLOYMENT.md) for Docker, Vultr, HTTPS, storage, and configuration. The production cookie requires HTTPS.

See [architecture and boundaries](docs/ARCHITECTURE.md), [accepted build plan](docs/BUILD_PLAN.md), and [validation record](docs/VALIDATION.md). This is a functioning local MVP with service adapters, not a claim of a completed public pilot. Before broader launch, finish email verification/password recovery, moderation operations, live integration tests, and accessibility/browser QA.
