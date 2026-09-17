CREATE TABLE glow_journey_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES glow_journeys(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 30),
  phase TEXT NOT NULL CHECK (phase IN ('RESET', 'BUILD', 'DEEPEN', 'INTEGRATE', 'RECHECK')),
  action_id TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('radiance', 'hydration_appearance', 'evenness', 'texture', 'under_eye_appearance', 'overall_vitality')),
  role TEXT NOT NULL,
  selection_reason TEXT NULL,
  archetype_modifier TEXT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (lifecycle_status IN ('AVAILABLE', 'INTRODUCED', 'TRIED', 'REPEATED', 'CORE', 'RETIRED')),
  completion_status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (completion_status IN ('NOT_STARTED', 'COMPLETED', 'SKIPPED')),
  introduced_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)