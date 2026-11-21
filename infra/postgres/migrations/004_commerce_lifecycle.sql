-- Inventory reservation and private-delivery lifecycle.
ALTER TABLE app_order ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz;
CREATE TABLE IF NOT EXISTS inventory_reservation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES app_order(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES variant(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  state text NOT NULL DEFAULT 'reserved',
  expires_at timestamptz NOT NULL,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,variant_id)
);
CREATE INDEX IF NOT EXISTS inventory_reservation_variant_idx ON inventory_reservation(variant_id,state,expires_at);
CREATE INDEX IF NOT EXISTS inventory_reservation_order_idx ON inventory_reservation(order_id,state);
