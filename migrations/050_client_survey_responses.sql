CREATE TABLE client_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id TEXT UNIQUE NOT NULL,
  session_id TEXT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  locale TEXT NOT NULL DEFAULT 'en-GB',
  primary_goal TEXT NOT NULL,
  age_range TEXT NOT NULL,
  concerns JSONB NOT NULL DEFAULT '[]'::jsonb,
  routine_level TEXT NOT NULL,
  skincare_confidence TEXT NOT NULL,
  acquisition_source TEXT NULL,
  referrer TEXT NULL,
  utm_source TEXT NULL,
  utm_medium TEXT NULL,
  utm_campaign TEXT NULL,
  utm_content TEXT NULL,
  utm_term TEXT NULL,
  rewardful_referral TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX client_survey_responses_created_at_idx
  ON client_survey_responses(created_at);

CREATE INDEX client_survey_responses_age_range_idx
  ON client_survey_responses(age_range);

CREATE INDEX client_survey_responses_primary_goal_idx
  ON client_survey_responses(primary_goal);