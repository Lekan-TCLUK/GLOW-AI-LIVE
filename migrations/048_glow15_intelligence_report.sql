ALTER TABLE glow_journeys
  ADD COLUMN IF NOT EXISTS glow_intelligence_report_url text,
  ADD COLUMN IF NOT EXISTS glow_intelligence_report_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS glow_intelligence_report_sent_at timestamptz;