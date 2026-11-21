# MWAHLI Production Deployment Guide

## 1. Secrets and configuration

Start from `.env.production.example`. Put real values in your host/secret manager, never in Git.

```bash
export NODE_ENV=production
npm run check:env
```

The preflight fails when a production-critical service is missing for an enabled feature, when demo accounts are enabled, when HTTPS is missing, or when core encryption/session configuration is unsafe.

## 2. Required production services

- HTTPS web/API runtime.
- PostgreSQL with point-in-time recovery.
- Redis for rate limits/short-lived coordination where configured.
- Private S3-compatible object storage + KMS/encryption + media scanner.
- Search service for catalogue/discovery.
- Long-running MWAHLI worker process.
- At least one live payment rail; logistics for Local; KYC for Creators.
- Notification/email delivery.
- Sentry or OpenTelemetry endpoint and uptime/business-event alerts.

The included Docker Compose file is for local/integration use, not production HA.

## 3. Database

For a fresh database or controlled migration deployment:

```bash
npm run migrate
```

The migration runner records applied files in `schema_migration`. Back up before schema changes and run migrations once per release through CI/CD.

## 4. Release gate and web deployment

```bash
npm install
npm run release:check
npm run migrate
npm run start
```

Run the worker separately:

```bash
npm run worker
```

Liveness: `/api/health`  
Readiness: `/api/health/readiness`

Do not route public traffic until readiness is healthy and provider/webhook sandbox checks pass.

## 5. Webhooks and provider callbacks

Point enabled providers at `/api/webhooks/{provider}` and use the provider-specific signing secret in the production environment. Verify replay protection and idempotency with provider sandbox events before enabling live money/fulfilment.

## 6. PWA/private caching

The service worker excludes authenticated/private recipient content. Revalidate CDN rules in production so personalized APIs, private receipts and recipient experiences cannot enter shared caches.

## 7. Mobile

`apps/mobile` is the production-shaped Expo/React Native consumer client, not a placeholder screen. Before store submission:

- Set final bundle/package identifiers if different from `com.mwahli.app`.
- Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_APP_URL` to HTTPS production endpoints.
- Configure signing, APNs/FCM/push credentials and deep-link domains.
- Run `npm run typecheck --workspace @mwahli/mobile` after install.
- Run Expo/EAS Android and iOS production builds on real devices.
- Complete accessibility, privacy/data-safety, age rating, screenshots, support URL and store review.

## 8. Go-live order

1. Deploy DB/storage/search/worker and web behind restricted access.
2. Run migrations and `release:check`.
3. Validate auth, MFA/passkeys and privacy export/delete.
4. Validate Studio upload/publish/recipient experience.
5. Validate payment webhooks, cancellation/refunds and reconciliation.
6. Validate private delivery tokens, logistics and proof/state callbacks.
7. Validate Together, Creator/KYC, Care and Capsule scheduled jobs.
8. Run external security and backup/recovery evidence.
9. Open public traffic only after `docs/LAUNCH_GATES.md` is signed off.
