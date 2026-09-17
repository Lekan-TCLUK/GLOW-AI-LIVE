CREATE TABLE glow_assessment_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES glow_assessments(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 3),
  dimension TEXT NOT NULL CHECK (dimension IN ('radiance', 'hydration_appearance', 'evenness', 'texture', 'under_eye_appearance', 'overall_vitality')),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, rank),
  UNIQUE (assessment_id, dimension)
)