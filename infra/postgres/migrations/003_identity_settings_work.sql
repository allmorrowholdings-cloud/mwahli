-- MWAHLI identity, settings and work-domain completion.
CREATE TABLE IF NOT EXISTS email_verification_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_verification_user_idx ON email_verification_token(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS auth_challenge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_user(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  challenge_hash text UNIQUE NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_challenge_due_idx ON auth_challenge(purpose,expires_at) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS passkey_credential (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  credential_id text UNIQUE NOT NULL,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  device_type text,
  backed_up boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS passkey_user_idx ON passkey_credential(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS user_setting (
  user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  theme text NOT NULL DEFAULT 'system',
  notification_preferences jsonb NOT NULL DEFAULT '{"email":true,"push":true,"sms":false,"whatsapp":false}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE corporate_program ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS corporate_recipient (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES corporate_program(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  external_key text,
  display_label text,
  contact_ciphertext bytea,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id,external_key)
);
CREATE INDEX IF NOT EXISTS corporate_recipient_program_idx ON corporate_recipient(program_id,created_at DESC);

CREATE TABLE IF NOT EXISTS corporate_invoice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES corporate_program(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  currency char(3) NOT NULL,
  total_minor bigint NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'draft',
  period_start date,
  period_end date,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchant_listing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchant(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  action text NOT NULL,
  product_id uuid REFERENCES product(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS corporate_program_owner_idx ON corporate_program(owner_user_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS product_merchant_active_idx ON product(merchant_id,active,created_at DESC);
CREATE INDEX IF NOT EXISTS commission_creator_status_idx ON commission(creator_id,status,created_at DESC);
