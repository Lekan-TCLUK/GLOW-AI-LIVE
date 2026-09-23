CREATE TABLE IF NOT EXISTS glow15_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id text NOT NULL UNIQUE,
  monthly_budget_gbp numeric(10,2) NOT NULL DEFAULT 50.00,
  routine_json jsonb NOT NULL DEFAULT '{"am":[],"pm":[]}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
)