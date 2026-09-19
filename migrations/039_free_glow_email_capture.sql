ALTER TABLE glow_journeys ADD COLUMN IF NOT EXISTS email_captured_at timestamptz;
ALTER TABLE glow_journeys ADD COLUMN IF NOT EXISTS marketing_email_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE glow_journeys ADD COLUMN IF NOT EXISTS marketing_email_opt_in_at timestamptz;