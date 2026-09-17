CREATE TABLE glow_master_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NULL REFERENCES glow_journeys(id) ON DELETE CASCADE,
  assessment_id UUID NULL REFERENCES glow_assessments(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL CHECK (output_type IN ('FREE_SNAPSHOT', 'PERSONAL_GLOW_PLAN', 'PROGRESS')),
  schema_version TEXT NOT NULL,
  content_version TEXT NOT NULL,
  output_json JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)