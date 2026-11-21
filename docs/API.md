# API Surface

The web app ships route-handler examples and adapter interfaces. Expand them behind the same authorization, consent and audit rules.

## Consumer routes

- `POST /api/auth/login` — credential login or development demo login.
- `POST /api/auth/logout` — clear session.
- `GET /api/auth/google` + `GET /api/auth/google/callback` — Google OAuth with state-cookie verification and database account linking/creation.
- `POST /api/auth/forgot-password` — generic-response recovery request with expiring hashed token.
- `POST /api/auth/reset-password` — consume reset token, update password and revoke stored sessions.
- `POST /api/people` — create a relationship-graph person record.
- `POST /api/muse` — intent/feeling/budget suggestions. Human approval remains required.
- `POST /api/studio` — validate and create an experience draft/share ID.
- `GET /api/health` — liveness metadata.

## Webhook ingress

- `POST /api/webhooks/:provider` — signature-verification and idempotency seam for payment/logistics providers.

Replace the generic signature mapping with each provider's documented signing scheme before enabling live webhooks.

## Partner APIs planned by the blueprint

- Gift ID API
- Surprise API
- Delivery Token API
- Universal Receipt API
- Local Fulfilment API
- Moment Widget
- Studio Embed
- Agent Commerce API
- Corporate API

Partner APIs must be scoped by tenant, purpose and approved recipient disclosure. Do not allow a merchant to query an entire Gift ID profile.
