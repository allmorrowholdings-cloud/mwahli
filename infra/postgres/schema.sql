CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('shopper','creator','merchant','work_admin','ops','trust_safety','finance','support');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE money_state AS ENUM ('pending','authorized','paid','failed','refunded','partially_refunded','disputed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE delivery_state AS ENUM ('planned','awaiting_recipient','ready','dispatched','delivered','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'shopper',
  display_name text,
  email_verified_at timestamptz,
  mfa_enrolled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS session_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL, user_agent_hash text, ip_prefix inet, created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL, revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS password_reset_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset_token(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS person (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  name text NOT NULL, relationship_label text NOT NULL, preferred_contact text, timezone text,
  private_notes_ciphertext bytea, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS person_owner_idx ON person(owner_user_id);
CREATE TABLE IF NOT EXISTS relationship (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES person(id) ON DELETE CASCADE, label text NOT NULL, status text NOT NULL DEFAULT 'active',
  shared_space_revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS moment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  person_id uuid REFERENCES person(id) ON DELETE CASCADE, kind text NOT NULL, title text NOT NULL, occurs_at timestamptz,
  recurrence_rule text, source text NOT NULL DEFAULT 'manual', calendar_consent_id uuid, reminder_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moment_owner_time_idx ON moment(owner_user_id, occurs_at);
CREATE TABLE IF NOT EXISTS tradition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  person_id uuid REFERENCES person(id) ON DELETE CASCADE, title text NOT NULL, notes_ciphertext bytea, active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS consent_grant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subject_user_id uuid REFERENCES app_user(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL, scope text NOT NULL, resource_type text, resource_id uuid,
  granted boolean NOT NULL, source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS consent_subject_scope_idx ON consent_grant(subject_user_id,scope,created_at DESC);
CREATE TABLE IF NOT EXISTS block_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  blocked_user_id uuid REFERENCES app_user(id) ON DELETE CASCADE, block_all_surprises boolean NOT NULL DEFAULT false,
  no_contact boolean NOT NULL DEFAULT true, reason_code text, created_at timestamptz NOT NULL DEFAULT now(), lifted_at timestamptz
);
CREATE TABLE IF NOT EXISTS gift_id_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  preferences_ciphertext bytea, fit_ciphertext bytea, allergy_ciphertext bytea, disclosure_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS delivery_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL, address_ciphertext bytea NOT NULL, instructions_ciphertext bytea,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS surprise_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES app_user(id) ON DELETE CASCADE, recipient_contact_hash text,
  question_type text NOT NULL, question_text text NOT NULL, answer_ciphertext bytea, status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), answered_at timestamptz
);

CREATE TABLE IF NOT EXISTS media_asset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  storage_key text UNIQUE NOT NULL, content_type text NOT NULL, bytes bigint NOT NULL DEFAULT 0, sha256 text,
  malware_state text NOT NULL DEFAULT 'pending', moderation_state text NOT NULL DEFAULT 'pending', encryption_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS studio_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  person_id uuid REFERENCES person(id) ON DELETE SET NULL, moment_id uuid REFERENCES moment(id) ON DELETE SET NULL,
  title text NOT NULL, share_id text UNIQUE NOT NULL, status text NOT NULL DEFAULT 'draft', theme text NOT NULL DEFAULT 'candlelight',
  protection jsonb NOT NULL DEFAULT '{}'::jsonb, published_at timestamptz, expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS studio_block (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), experience_id uuid NOT NULL REFERENCES studio_experience(id) ON DELETE CASCADE,
  block_type text NOT NULL, position integer NOT NULL, payload_ciphertext bytea, payload_public jsonb,
  ai_assisted boolean NOT NULL DEFAULT false, sender_approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(experience_id,position)
);
CREATE TABLE IF NOT EXISTS experience_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), experience_id uuid NOT NULL REFERENCES studio_experience(id) ON DELETE CASCADE,
  version integer NOT NULL, render_manifest jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(experience_id,version)
);
CREATE TABLE IF NOT EXISTS recipient_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), experience_id uuid NOT NULL REFERENCES studio_experience(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL, opened_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  analytics_consent boolean NOT NULL DEFAULT false, last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  person_id uuid REFERENCES person(id) ON DELETE SET NULL, experience_id uuid REFERENCES studio_experience(id) ON DELETE SET NULL,
  kind text NOT NULL, content_ciphertext bytea, media_asset_id uuid REFERENCES media_asset(id) ON DELETE SET NULL,
  recipient_save_consent boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS capsule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  experience_id uuid REFERENCES studio_experience(id) ON DELETE CASCADE, unlock_at timestamptz NOT NULL,
  trustee_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'scheduled', cancellation_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL, name text NOT NULL,
  city text, country text, verification_state text NOT NULL DEFAULT 'pending', substitution_policy text, fulfilment_sla_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), merchant_id uuid NOT NULL REFERENCES merchant(id) ON DELETE CASCADE,
  title text NOT NULL, description text, category text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS variant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  sku text UNIQUE NOT NULL, title text NOT NULL, price_minor bigint NOT NULL, currency char(3) NOT NULL, inventory integer,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb, active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS creator_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  display_name text NOT NULL, mediums text[] NOT NULL DEFAULT '{}', city text, country text, verification_state text NOT NULL DEFAULT 'pending',
  rights_default jsonb NOT NULL DEFAULT '{}'::jsonb, rating numeric(3,2), capacity_state text NOT NULL DEFAULT 'available'
);
CREATE TABLE IF NOT EXISTS commission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), buyer_user_id uuid NOT NULL REFERENCES app_user(id), creator_id uuid NOT NULL REFERENCES creator_profile(id),
  title text NOT NULL, brief_ciphertext bytea NOT NULL, budget_minor bigint, currency char(3), deadline timestamptz,
  status text NOT NULL DEFAULT 'brief', rights jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS milestone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), commission_id uuid NOT NULL REFERENCES commission(id) ON DELETE CASCADE,
  title text NOT NULL, position integer NOT NULL, amount_minor bigint, state text NOT NULL DEFAULT 'pending', due_at timestamptz, approved_at timestamptz
);

CREATE TABLE IF NOT EXISTS cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_user(id), currency char(3) NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_user(id), recipient_user_id uuid REFERENCES app_user(id),
  order_number text UNIQUE NOT NULL, state text NOT NULL DEFAULT 'pending', currency char(3) NOT NULL, total_minor bigint NOT NULL,
  delivery_token_id uuid REFERENCES delivery_token(id), metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payment_intent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid REFERENCES app_order(id), provider text NOT NULL, provider_reference text UNIQUE NOT NULL,
  amount_minor bigint NOT NULL, currency char(3) NOT NULL, state money_state NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ledger_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_type text NOT NULL, owner_id uuid, currency char(3) NOT NULL, account_type text NOT NULL,
  UNIQUE(owner_type,owner_id,currency,account_type)
);
CREATE TABLE IF NOT EXISTS ledger_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id uuid NOT NULL, account_id uuid NOT NULL REFERENCES ledger_account(id),
  amount_minor bigint NOT NULL CHECK (amount_minor <> 0), currency char(3) NOT NULL, entry_type text NOT NULL, reference_type text NOT NULL,
  reference_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_transaction_idx ON ledger_entry(transaction_id);
CREATE TABLE IF NOT EXISTS contribution_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizer_user_id uuid NOT NULL REFERENCES app_user(id), title text NOT NULL,
  target_minor bigint, currency char(3) NOT NULL, status text NOT NULL DEFAULT 'open', recipient_user_id uuid REFERENCES app_user(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS contribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pool_id uuid NOT NULL REFERENCES contribution_pool(id) ON DELETE CASCADE,
  contributor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL, amount_minor bigint NOT NULL, private_amount boolean NOT NULL DEFAULT true,
  payment_intent_id uuid REFERENCES payment_intent(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS refund (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_intent_id uuid NOT NULL REFERENCES payment_intent(id), amount_minor bigint NOT NULL,
  reason text NOT NULL, state text NOT NULL DEFAULT 'pending', provider_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), beneficiary_type text NOT NULL, beneficiary_id uuid NOT NULL, amount_minor bigint NOT NULL,
  currency char(3) NOT NULL, provider text, provider_reference text, state text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fulfilment_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES app_order(id), strategy text NOT NULL,
  provider_id uuid, confidence numeric(4,3), landed_cost_minor bigint, currency char(3), substitution_policy text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS delivery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES app_order(id), fulfilment_plan_id uuid REFERENCES fulfilment_plan(id),
  state delivery_state NOT NULL DEFAULT 'planned', promised_at timestamptz, dispatched_at timestamptz, delivered_at timestamptz,
  proof_asset_id uuid REFERENCES media_asset(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS delivery_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), delivery_id uuid NOT NULL REFERENCES delivery(id) ON DELETE CASCADE,
  event_type text NOT NULL, event_at timestamptz NOT NULL DEFAULT now(), public_payload jsonb NOT NULL DEFAULT '{}'::jsonb, private_payload_ciphertext bytea
);
CREATE TABLE IF NOT EXISTS gift_receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES app_order(id), receipt_token_hash text UNIQUE NOT NULL,
  recipient_user_id uuid REFERENCES app_user(id), disclosure_policy jsonb NOT NULL DEFAULT '{}'::jsonb, expires_at timestamptz
);
CREATE TABLE IF NOT EXISTS exchange_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), receipt_id uuid NOT NULL REFERENCES gift_receipt(id), recipient_user_id uuid REFERENCES app_user(id),
  request_type text NOT NULL, requested_change jsonb NOT NULL, sender_visibility text NOT NULL DEFAULT 'delivered_only', state text NOT NULL DEFAULT 'requested', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS provenance_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), object_type text NOT NULL, object_id uuid NOT NULL, maker_name text,
  materials jsonb, care jsonb, provenance jsonb, nfc_public_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_room (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizer_user_id uuid NOT NULL REFERENCES app_user(id), person_id uuid REFERENCES person(id),
  title text NOT NULL, invite_token_hash text UNIQUE NOT NULL, contribution_pool_id uuid REFERENCES contribution_pool(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS room_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES group_room(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL, content_ciphertext bytea, media_asset_id uuid REFERENCES media_asset(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vote (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES group_room(id) ON DELETE CASCADE,
  voter_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL, option_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(room_id,voter_user_id)
);
CREATE TABLE IF NOT EXISTS care_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_user(id), recipient_user_id uuid REFERENCES app_user(id),
  person_id uuid REFERENCES person(id), title text NOT NULL, boundaries jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'draft', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS care_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES care_plan(id) ON DELETE CASCADE, task_type text NOT NULL,
  title text NOT NULL, assigned_user_id uuid REFERENCES app_user(id), provider_id uuid, scheduled_at timestamptz,
  state text NOT NULL DEFAULT 'open', dedupe_key text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS care_dedupe_idx ON care_task(plan_id,dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS corporate_program (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_name text NOT NULL, owner_user_id uuid NOT NULL REFERENCES app_user(id),
  title text NOT NULL, policy jsonb NOT NULL DEFAULT '{}'::jsonb, budget_minor bigint, currency char(3), status text NOT NULL DEFAULT 'draft', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS budget_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), program_id uuid NOT NULL REFERENCES corporate_program(id) ON DELETE CASCADE,
  rule_type text NOT NULL, value jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_case (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_user_id uuid REFERENCES app_user(id), subject_user_id uuid REFERENCES app_user(id),
  risk_type text NOT NULL, severity integer NOT NULL CHECK(severity BETWEEN 1 AND 5), state text NOT NULL DEFAULT 'open',
  details_ciphertext bytea, owner_user_id uuid REFERENCES app_user(id), created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE IF NOT EXISTS moderation_case (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), object_type text NOT NULL, object_id uuid NOT NULL, reason text NOT NULL,
  state text NOT NULL DEFAULT 'open', owner_user_id uuid REFERENCES app_user(id), created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE IF NOT EXISTS webhook_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, provider_event_id text NOT NULL, signature_valid boolean NOT NULL,
  payload_sha256 text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz, state text NOT NULL DEFAULT 'received',
  UNIQUE(provider,provider_event_id)
);
CREATE TABLE IF NOT EXISTS scheduled_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_type text NOT NULL, run_at timestamptz NOT NULL, dedupe_key text UNIQUE,
  payload_ciphertext bytea, attempts integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 12, state text NOT NULL DEFAULT 'queued',
  locked_at timestamptz, completed_at timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scheduled_job_due_idx ON scheduled_job(state,run_at);
CREATE TABLE IF NOT EXISTS audit_event (
  id bigserial PRIMARY KEY, actor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL, action text NOT NULL, resource_type text NOT NULL,
  resource_id uuid, sensitivity text NOT NULL DEFAULT 'normal', ip_prefix inet, user_agent_hash text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_resource_idx ON audit_event(resource_type,resource_id,created_at DESC);

-- Every money movement should write balanced ledger entries in one DB transaction.
-- Sensitive fields above marked *_ciphertext should be envelope-encrypted by the application/KMS before insert.
-- Production should add tenant/role policies or RLS after the exact auth model is finalized and test them with negative-access tests.

-- Launch-ready additive objects. Kept idempotent so schema.sql can initialize a fresh database.
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS mfa_secret_ciphertext bytea;
ALTER TABLE surprise_request ADD COLUMN IF NOT EXISTS response_token_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS surprise_response_token_idx ON surprise_request(response_token_hash) WHERE response_token_hash IS NOT NULL;

-- Additional launch-hardening columns are also applied by migrations/002_launch_hardening.sql.
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS provider_reference text;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS last_provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
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

-- Identity/settings/work additions from migrations/003_identity_settings_work.sql.
CREATE TABLE IF NOT EXISTS email_verification_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_verification_user_idx ON email_verification_token(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS auth_challenge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES app_user(id) ON DELETE CASCADE,
  purpose text NOT NULL, challenge_hash text UNIQUE NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS passkey_credential (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  credential_id text UNIQUE NOT NULL, public_key bytea NOT NULL, counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}', device_type text, backed_up boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz
);
CREATE TABLE IF NOT EXISTS user_setting (
  user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE, locale text NOT NULL DEFAULT 'en', timezone text NOT NULL DEFAULT 'UTC',
  theme text NOT NULL DEFAULT 'system', notification_preferences jsonb NOT NULL DEFAULT '{"email":true,"push":true,"sms":false,"whatsapp":false}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE corporate_program ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS corporate_recipient (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), program_id uuid NOT NULL REFERENCES corporate_program(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL, external_key text, display_label text, contact_ciphertext bytea,
  status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(program_id,external_key)
);
CREATE TABLE IF NOT EXISTS corporate_invoice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), program_id uuid NOT NULL REFERENCES corporate_program(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL, currency char(3) NOT NULL, total_minor bigint NOT NULL DEFAULT 0, state text NOT NULL DEFAULT 'draft',
  period_start date, period_end date, issued_at timestamptz, paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS merchant_listing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), merchant_id uuid NOT NULL REFERENCES merchant(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL, action text NOT NULL, product_id uuid REFERENCES product(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

-- Commerce lifecycle additions from migrations/004_commerce_lifecycle.sql.
ALTER TABLE app_order ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz;
CREATE TABLE IF NOT EXISTS inventory_reservation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES app_order(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES variant(id) ON DELETE CASCADE, quantity integer NOT NULL CHECK (quantity > 0),
  state text NOT NULL DEFAULT 'reserved', expires_at timestamptz NOT NULL, committed_at timestamptz, released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,variant_id)
);
CREATE INDEX IF NOT EXISTS inventory_reservation_variant_idx ON inventory_reservation(variant_id,state,expires_at);
CREATE INDEX IF NOT EXISTS inventory_reservation_order_idx ON inventory_reservation(order_id,state);

-- Consolidated launch-hardening objects from migration 002 so a fresh schema.sql bootstrap
-- is equivalent to running the migration chain.
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
CREATE INDEX IF NOT EXISTS audit_actor_created_idx ON audit_event(actor_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS risk_state_severity_idx ON risk_case(state,severity DESC,created_at);
CREATE INDEX IF NOT EXISTS moderation_state_idx ON moderation_case(state,created_at);
CREATE INDEX IF NOT EXISTS block_recipient_active_idx ON block_rule(recipient_user_id,created_at DESC) WHERE lifted_at IS NULL;
CREATE INDEX IF NOT EXISTS delivery_provider_reference_idx ON delivery(provider,provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS group_room_member_user_idx ON group_room_member(user_id,joined_at DESC);
