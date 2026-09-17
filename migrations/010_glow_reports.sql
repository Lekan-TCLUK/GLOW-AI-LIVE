CREATE TABLE glow_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES glow_journeys(id) ON DELETE CASCADE,
  master_output_id UUID NOT NULL REFERENCES glow_master_outputs(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('FREE_SNAPSHOT', 'PERSONAL_GLOW_PLAN', 'PROGRESS')),
  report_version TEXT NOT NULL,
  template_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'GENERATING', 'READY', 'DELIVERY_PENDING', 'DELIVERED', 'FAILED', 'SUPERSEDED')),
  storage_key TEXT NULL,
  file_hash TEXT NULL,
  failure_reason TEXT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_at TIMESTAMPTZ NULL,
  ready_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)