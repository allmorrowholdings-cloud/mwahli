const env = process.env;
const production = env.NODE_ENV === 'production';
const enc = env.APP_DATA_ENCRYPTION_KEY || env.ENCRYPTION_KEY;
let failed = false;
const fail = (message) => { console.error(`FAIL ${message}`); failed = true; };
const ok = (message) => console.log(`OK   ${message}`);
const pending = (message) => console.log(`EXT  ${message}`);
const truthy = (key) => env[key] === 'true';

for (const key of ['APP_URL','DATABASE_URL','SESSION_SECRET']) {
  env[key] ? ok(key) : fail(`missing ${key}`);
}
if (!enc) fail('missing APP_DATA_ENCRYPTION_KEY (or ENCRYPTION_KEY alias)');
else {
  try {
    if (Buffer.from(enc,'base64').length !== 32) throw new Error('length');
    ok('32-byte application encryption key');
  } catch { fail('APP_DATA_ENCRYPTION_KEY must be exactly 32 random bytes encoded as base64'); }
}
if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) fail('SESSION_SECRET must be at least 32 characters');

if (production) {
  if (!/^https:\/\//i.test(env.APP_URL || '')) fail('APP_URL must use HTTPS in production');
  if (!/^https:\/\//i.test(env.NEXT_PUBLIC_APP_URL || env.APP_URL || '')) fail('NEXT_PUBLIC_APP_URL must use HTTPS in production');
  if (truthy('DEV_DEMO_ENABLED')) fail('DEV_DEMO_ENABLED must be false in production');
  if ((env.AUTH_REQUIRE_ADMIN_MFA || env.ADMIN_MFA_REQUIRED || 'true') === 'false') fail('admin MFA must be enabled in production');
  if (env.AUTH_EMAIL_VERIFICATION_REQUIRED === 'false') console.warn('WARN email verification is disabled');
  if (env.DB_SSL === 'false') console.warn('WARN DB_SSL=false; use only when your managed database uses a private trusted network');
}

const configured = {
  storage: !!env.OBJECT_STORAGE_BUCKET && !!env.OBJECT_STORAGE_REGION && !!env.OBJECT_STORAGE_ACCESS_KEY && !!env.OBJECT_STORAGE_SECRET_KEY,
  mediaScan: !!(env.MEDIA_SCAN_URL || env.MALWARE_SCANNER_URL),
  payments: !!(env.PAYSTACK_SECRET_KEY || env.FLUTTERWAVE_SECRET_KEY || env.STRIPE_SECRET_KEY || env.MOMO_API_KEY),
  notifications: !!(env.NOTIFICATION_GATEWAY_URL || (env.EMAIL_PROVIDER && env.EMAIL_API_KEY)),
  logistics: !!env.LOGISTICS_API_URL && !!(env.LOGISTICS_API_TOKEN || env.LOGISTICS_API_KEY),
  kyc: !!env.KYC_PROVIDER_URL && !!(env.KYC_PROVIDER_TOKEN || env.KYC_PROVIDER_API_KEY),
  search: !!env.SEARCH_URL,
  ai: !!env.OPENAI_API_KEY && !!env.OPENAI_MODEL,
  observability: !!(env.SENTRY_DSN || env.OTEL_EXPORTER_OTLP_ENDPOINT),
  googleAuth: !!env.AUTH_GOOGLE_CLIENT_ID && !!env.AUTH_GOOGLE_CLIENT_SECRET && !!env.AUTH_GOOGLE_REDIRECT_URI,
};

for (const [name,value] of Object.entries(configured)) value ? ok(name) : pending(`${name} credentials/provider not configured`);

if (production) {
  if (truthy('FEATURE_FLAG_LOCAL_COMMERCE') && !configured.logistics) fail('local commerce is enabled but logistics is not configured');
  if (truthy('FEATURE_FLAG_LOCAL_COMMERCE') && !configured.payments) fail('local commerce is enabled but no payment provider is configured');
  if (truthy('FEATURE_FLAG_CREATORS') && !configured.kyc) fail('creator marketplace is enabled but KYC is not configured');
  if (!configured.storage) fail('private object storage is required for production');
  if (!configured.mediaScan) fail('media scanning is required for production');
  if (!configured.notifications) fail('notification/email delivery is required for production');
  if (!env.REDIS_URL) fail('REDIS_URL is required for production coordination, queues and rate limiting');
  if (!env.MEDIA_SIGNING_SECRET || env.MEDIA_SIGNING_SECRET.length < 32) fail('MEDIA_SIGNING_SECRET >=32 chars is required in production');
  if (!env.WEBHOOK_SECRET || env.WEBHOOK_SECRET.length < 32) fail('WEBHOOK_SECRET >=32 chars is required in production');
  if (!truthy('COOKIE_SECURE')) fail('COOKIE_SECURE=true is required in production');
  if (!configured.search) fail('SEARCH_URL is required for the production marketplace/search surface');
  if (!configured.observability) fail('Sentry or OpenTelemetry endpoint is required for production observability');
}

console.log(failed ? '\nMWAHLI environment preflight FAILED.' : '\nMWAHLI environment preflight PASSED.');
process.exit(failed ? 1 : 0);
