CREATE TABLE glow_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_score INTEGER NOT NULL,
  band TEXT NOT NULL,
  analysis_json JSONB NOT NULL
)