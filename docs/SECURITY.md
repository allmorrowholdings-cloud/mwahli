# Security, Privacy and Recipient Safety

MWAHLI can hold intimate relationship data, private letters, voice notes, addresses, birthdays, grief context, photos and future messages. The application therefore treats privacy and safety as product behavior, not a legal footer.

## Implemented patterns

- Signed `HttpOnly`, `SameSite=Lax` session cookie with `Secure` in production.
- Strong production secret requirement.
- Password hashing uses Node `scrypt`; production can swap to Argon2id through the auth adapter.
- Security headers and restrictive CSP baseline.
- API input validation through Zod.
- Webhook HMAC verification seam and idempotency event table.
- Sensitive schema fields are explicitly marked as ciphertext fields for envelope encryption.
- Recipient block/no-contact, surprise opt-out and delivery-token primitives.
- Selective-disclosure Gift ID model. Merchants should get only the field required for a transaction.
- Minimal recipient analytics. Repeated intimate-page viewing should not become sender surveillance.
- Audit-event schema for sensitive access and operator action.
- Durable scheduled-job model for capsule/reminder delivery with dedupe keys.

## Production requirements

1. Put production secrets in a managed secret store and use KMS envelope encryption.
2. Replace local demo auth with verified email/password, OAuth/passkeys and admin MFA.
3. Enforce authorization on every API and repository operation. UI route guards are not a security boundary.
4. Add transaction-scoped database authorization/RLS after exact organization and operator-role rules are finalized.
5. Use private object storage. Never expose raw private-media bucket URLs.
6. Scan uploads for malware before making any derivative available; run media moderation and intimate-content policy checks.
7. Encrypt addresses, fit data, allergies, private notes and recipient answers before database insert.
8. Prevent SSRF in all remote-media/import features. Allowlist outbound integrations where possible.
9. Verify every payment/KYC/logistics webhook according to that provider's exact signing protocol, then dedupe before side effects.
10. Keep immutable financial ledger entries and reconcile provider balances every day.
11. Apply rate limits to login, recovery, surprise requests, Muse, upload, invite and webhook endpoints.
12. Add CSRF tokens for state-changing browser form endpoints if they accept cookie authentication outside SameSite-safe patterns.
13. Require explicit sender approval before AI-assisted intimate copy can be published or sent.
14. Staff no-contact, stalking, harassment, fraud and intimate-media escalation paths.
15. Run external penetration testing, secret scanning, dependency scanning, SAST and DAST before public launch.
16. Rehearse account compromise, private-media exposure, payment mismatch, delivery failure and scheduled-capsule incidents.
