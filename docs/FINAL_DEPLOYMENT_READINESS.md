# MWAHLI v2.0 — Final Deployment Readiness

## Source of truth
`npm run preview` now runs the **actual Next.js application** on port 4173. It no longer serves the static preview document. The old static showcase remains available only as `npm run preview:static` and is not a functional product preview.

## Deployment target
The web app is configured for Next.js `standalone` output and includes a multi-stage non-root Dockerfile. Production containers run as an unprivileged user and expose port 3000.

## Required live configuration
Before public traffic, provide real values for APP_URL, NEXT_PUBLIC_APP_URL, DATABASE_URL, REDIS_URL, SESSION_SECRET, APP_DATA_ENCRYPTION_KEY, MEDIA_SIGNING_SECRET, WEBHOOK_SECRET, object storage, malware scanning, notifications/email, search, observability, payments/logistics/KYC when their feature flags are enabled, and any production OAuth/AI credentials in use.

## Required final gates
1. `npm install`
2. `npm run check:env` with production environment loaded
3. `npm run migrate`
4. `npm run release:check`
5. Start production service and verify `/api/health` and `/api/health/readiness`
6. Run live smoke journeys: signup/login/email verification, recipient creation, Studio draft/save, Keeps upload, Capsule schedule/open policy, Together contribution, Gifts order/payment/webhook, creator/KYC path, care flow, notifications, privacy export/deletion, admin MFA, logout/session revocation.
7. Verify backup restore, object-storage access controls, malware-scanning failure behavior, rate limiting, webhook replay protection, alerting, and rollback procedure.

## Important
The repository can be deployment-ready without external credentials being embedded. Secrets are intentionally not included in the archive.
