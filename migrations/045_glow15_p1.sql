CREATE TABLE IF NOT EXISTS glow15_preferences (
  journey_id text PRIMARY KEY,
  monthly_budget_gbp numeric(10,2) NOT NULL DEFAULT 50.00,
  updated_at timestamptz NOT NULL DEFAULT now()
)