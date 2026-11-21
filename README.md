# MWAHLI — The Love OS

**Final code-side launch package, v1.0.0.** Built from the August 2026 Founder Blueprint around one human starting point: **Who are you thinking about?** The product then routes the user into **Make something**, **Send something**, or **Show up for them**.

## What is built

- **Web:** Next.js + React + TypeScript consumer application with People, Moments, Studio, Muse, Gifts, Local, Together, Creators, Care, Keeps, Capsule, Gift ID, Surprise, Orders, Exchange, Receipt, Loop and account/privacy surfaces.
- **Identity:** email/password, verification, password recovery, Google OAuth wiring, passkeys, signed HttpOnly sessions, admin MFA, role/ownership authorization and no-contact controls.
- **Studio:** persisted drafts, editable/versioned blocks, private media, publish/share flow, recipient sessions and interactive recipient experiences.
- **Commerce:** merchant catalogue/variants/inventory reservations, cart/order lifecycle, Paystack/Flutterwave/Stripe/MoMo adapters, provider webhooks, reconciliation, cancellation/refund jobs and private receipts/exchanges.
- **Global-to-local:** private delivery tokens, logistics quotes, fulfilment orchestration, substitutions/provider events and delivery state tracking.
- **Together:** invitation rooms, membership, messages, votes, contributions, payment state and closure.
- **Creators:** verified creator discovery, profiles, commission briefs, milestones, approvals, KYC adapter and payout-ready records.
- **Care:** recipient-boundary-aware care plans and tasks.
- **Keeps + Capsule:** private memory storage, export/delete controls, scheduled future delivery and retry-safe worker execution.
- **Work + Ops:** corporate programs, recipients, budget rules, invoices; operational queues for risk, moderation, payments, refunds, delivery and scheduled jobs.
- **Mobile:** Expo/React Native authenticated client covering the consumer core, Studio, People, Moments, Muse, Gifts, Local, Together, Creators, Care, Keeps, Capsules, Gift ID, Surprise, Orders and settings.
- **Infrastructure:** PostgreSQL schema/migrations, Redis-ready coordination, S3-compatible encrypted private media, search adapter, worker/scheduler, Docker development stack, observability hooks and production environment preflight.
- **Preview:** dependency-free interactive front-end preview under `preview/`.

## Put in your production credentials

Use `.env.production.example` as the production checklist and inject the real values through your deployment secret manager. Do **not** put real secrets in the repository.

```bash
export NODE_ENV=production
npm install
npm run check:env
npm run migrate
npm run release:check
npm run start
```

Run the worker as a separate long-running process:

```bash
npm run worker
```

`release:check` runs environment preflight, static QA, workspace typechecks and the real Next production build. It is the final CI gate after dependencies and your credentials are available.

## Local interactive preview

```bash
npm run preview
```

Then open `http://localhost:4173`.

## Release boundary

The source-code work is packaged. Remaining launch work is deliberately limited to things that cannot be completed inside a ZIP: your live `.env` credentials/accounts, DNS/domain/trademark clearance, legal approvals, live merchant/creator/courier/provider agreements, external penetration testing, production backup/restore rehearsal, production-provider E2E checks, app-store signing/review, and staffed Trust & Safety/support/finance operations.

## Local functional preview

Run `npm install`, then `npm run preview`. This launches the **actual Next.js application** at `http://localhost:4173`; it is not the static showcase. The legacy static showcase is available only with `npm run preview:static`.
