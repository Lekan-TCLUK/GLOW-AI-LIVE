CREATE TABLE glow_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES glow_journeys(id) ON DELETE CASCADE,
  report_id UUID NULL REFERENCES glow_reports(id) ON DELETE SET NULL,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('EMAIL_PDF', 'EMAIL_JOURNEY_LINK', 'SECURE_RESEND')),
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'SENDING', 'SENT', 'FAILED')),
  provider_reference TEXT NULL,
  failure_reason TEXT NULL,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)