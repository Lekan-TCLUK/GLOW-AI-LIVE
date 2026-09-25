ALTER TABLE client_survey_responses
  ADD COLUMN IF NOT EXISTS journey_id TEXT NULL;

CREATE INDEX IF NOT EXISTS client_survey_responses_journey_id_idx
  ON client_survey_responses(journey_id);

UPDATE client_survey_responses csr
SET journey_id = gj.journey_id
FROM glow_journeys gj
WHERE csr.journey_id IS NULL
  AND csr.session_id IS NOT NULL
  AND gj.session_id = csr.session_id;

CREATE TABLE IF NOT EXISTS glow16_intelligence_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id TEXT UNIQUE NOT NULL,
  survey_id TEXT NULL,
  profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  alignment_status TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (alignment_status IN ('ALIGNED','MIXED','DIFFERENT','UNKNOWN')),
  confidence_level TEXT NOT NULL DEFAULT 'STANDARD'
    CHECK (confidence_level IN ('HIGH','STANDARD','LOW')),
  profile_version TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS glow16_profiles_survey_id_idx
  ON glow16_intelligence_profiles(survey_id);

CREATE INDEX IF NOT EXISTS glow16_profiles_alignment_idx
  ON glow16_intelligence_profiles(alignment_status);

CREATE TABLE IF NOT EXISTS glow16_recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id TEXT NOT NULL,
  recommendation_id TEXT NOT NULL,
  product_id TEXT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('SHOWN','CLICKED','WISHLISTED','REMOVED','PURCHASED','DISMISSED')),
  source TEXT NOT NULL DEFAULT 'glow15',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS glow16_rec_events_journey_idx
  ON glow16_recommendation_events(journey_id, created_at);

CREATE INDEX IF NOT EXISTS glow16_rec_events_recommendation_idx
  ON glow16_recommendation_events(recommendation_id, event_type);

CREATE TABLE IF NOT EXISTS glow16_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id TEXT UNIQUE NOT NULL,
  initial_assessment_id UUID NULL,
  day30_assessment_id UUID NULL,
  initial_score INTEGER NULL,
  day30_score INTEGER NULL,
  overall_delta INTEGER NULL,
  dimension_deltas JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation_events_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS glow16_outcomes_delta_idx
  ON glow16_outcomes(overall_delta);

CREATE TABLE IF NOT EXISTS glow16_analytics_daily (
  metric_date DATE PRIMARY KEY,
  survey_started INTEGER NOT NULL DEFAULT 0,
  survey_completed INTEGER NOT NULL DEFAULT 0,
  survey_to_journey INTEGER NOT NULL DEFAULT 0,
  journeys_paid INTEGER NOT NULL DEFAULT 0,
  recommendation_shown INTEGER NOT NULL DEFAULT 0,
  recommendation_clicked INTEGER NOT NULL DEFAULT 0,
  recommendation_wishlisted INTEGER NOT NULL DEFAULT 0,
  recommendation_purchased INTEGER NOT NULL DEFAULT 0,
  day30_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);