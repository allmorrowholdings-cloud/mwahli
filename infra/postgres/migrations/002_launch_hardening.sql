-- MWAHLI launch hardening migration
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS mfa_secret_ciphertext bytea;
ALTER TABLE surprise_request ADD COLUMN IF NOT EXISTS response_token_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS surprise_response_token_idx ON surprise_request(response_token_hash) WHERE response_token_hash IS NOT NULL;

ALTER TABLE studio_experience ADD COLUMN IF NOT EXISTS recipient_label text;
ALTER TABLE studio_experience ADD COLUMN IF NOT EXISTS last_published_version integer;
ALTER TABLE studio_experience ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS studio_owner_status_idx ON studio_experience(owner_user_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS studio_share_live_idx ON studio_experience(share_id) WHERE deleted_at IS NULL;

ALTER TABLE app_order ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE app_order ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;
CREATE INDEX IF NOT EXISTS order_user_created_idx ON app_order(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS payment_order_idx ON payment_intent(order_id,created_at DESC);

ALTER TABLE merchant ADD COLUMN IF NOT EXISTS payout_profile jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE creator_profile ADD COLUMN IF NOT EXISTS payout_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS notification_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES app_user(id) ON DELETE CASCADE,
  channel text NOT NULL, destination_ciphertext bytea, template text NOT NULL, variables_ciphertext bytea,
  state text NOT NULL DEFAULT 'queued', provider_reference text, attempts integer NOT NULL DEFAULT 0,
  send_after timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_due_idx ON notification_record(state,send_after);

CREATE TABLE IF NOT EXISTS provider_connection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid REFERENCES app_user(id) ON DELETE CASCADE,
  provider text NOT NULL, external_subject text, scopes text[] NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, UNIQUE(owner_user_id,provider,external_subject)
);

CREATE TABLE IF NOT EXISTS data_deletion_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'requested', requested_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_quote (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider text NOT NULL, quote_reference text, expires_at timestamptz, amount_minor bigint, currency char(3),
  promise jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idempotency_key (
  key text PRIMARY KEY, owner_user_id uuid REFERENCES app_user(id) ON DELETE CASCADE, route text NOT NULL,
  response_code integer, response_body jsonb, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours'
);
CREATE INDEX IF NOT EXISTS idempotency_exp_idx ON idempotency_key(expires_at);

-- Security-focused indexes.
CREATE INDEX IF NOT EXISTS audit_actor_created_idx ON audit_event(actor_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS risk_state_severity_idx ON risk_case(state,severity DESC,created_at);
CREATE INDEX IF NOT EXISTS moderation_state_idx ON moderation_case(state,created_at);
CREATE INDEX IF NOT EXISTS block_recipient_active_idx ON block_rule(recipient_user_id,created_at DESC) WHERE lifted_at IS NULL;

-- The application always filters owner-scoped reads/writes by authenticated user.
-- Production DB roles should not receive table-owner or superuser privileges.

ALTER TABLE delivery ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS provider_reference text;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS last_provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS delivery_provider_reference_idx ON delivery(provider,provider_reference) WHERE provider_reference IS NOT NULL;

ALTER TABLE moment ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE contribution ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'pending';
ALTER TABLE contribution ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS group_room_member (
  room_id uuid NOT NULL REFERENCES group_room(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'contributor',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(room_id,user_id)
);
CREATE INDEX IF NOT EXISTS group_room_member_user_idx ON group_room_member(user_id,joined_at DESC);
