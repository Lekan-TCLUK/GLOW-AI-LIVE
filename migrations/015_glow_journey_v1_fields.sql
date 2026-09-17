ALTER TABLE glow_journeys
  ADD COLUMN initial_assessment_id UUID NULL REFERENCES glow_assessments(id),
  ADD COLUMN day30_assessment_id UUID NULL REFERENCES glow_assessments(id),
  ADD COLUMN master_output_id UUID NULL REFERENCES glow_master_outputs(id),
  ADD COLUMN plan_version TEXT NULL,
  ADD COLUMN journey_status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (journey_status IN ('PENDING_PAYMENT', 'PAID', 'ACTIVE', 'DAY30_AVAILABLE', 'DAY30_COMPLETED', 'COMPLETED', 'CANCELLED', 'REFUNDED')),
  ADD COLUMN journey_started_at TIMESTAMPTZ NULL,
  ADD COLUMN journey_completed_at TIMESTAMPTZ NULL,
  ADD COLUMN day30_entitlement_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (day30_entitlement_status IN ('AVAILABLE', 'IN_PROGRESS', 'CONSUMED'))