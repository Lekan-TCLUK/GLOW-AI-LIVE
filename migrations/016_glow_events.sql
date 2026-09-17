CREATE TABLE glow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NULL,
  journey_id UUID NULL REFERENCES glow_journeys(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)