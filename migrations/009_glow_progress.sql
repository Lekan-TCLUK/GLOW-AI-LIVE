CREATE TABLE glow_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES glow_journeys(id) ON DELETE CASCADE,
  day0_assessment_id UUID NOT NULL REFERENCES glow_assessments(id),
  day30_assessment_id UUID NOT NULL REFERENCES glow_assessments(id),
  day0_overall_score INTEGER NOT NULL CHECK (day0_overall_score BETWEEN 0 AND 100),
  day30_overall_score INTEGER NOT NULL CHECK (day30_overall_score BETWEEN 0 AND 100),
  overall_delta INTEGER NOT NULL CHECK (overall_delta BETWEEN -100 AND 100),
  overall_movement TEXT NOT NULL CHECK (overall_movement IN ('VISIBLE_MOVEMENT', 'POSITIVE_MOVEMENT', 'STEADY', 'DOWNWARD_MOVEMENT', 'SIGNIFICANT_MOVEMENT')),
  dimension_deltas JSONB NOT NULL,
  largest_upward JSONB NULL,
  largest_downward JSONB NULL,
  most_stable JSONB NULL,
  engine_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (journey_id),
  UNIQUE (day0_assessment_id, day30_assessment_id)
)