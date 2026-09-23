CREATE TABLE IF NOT EXISTS glow15_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id text NOT NULL,
  title text NOT NULL,
  brand text,
  category text NOT NULL DEFAULT 'other',
  tier text NOT NULL DEFAULT 'MID',
  estimated_price_gbp numeric(10,2),
  reason text,
  source_product_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
)