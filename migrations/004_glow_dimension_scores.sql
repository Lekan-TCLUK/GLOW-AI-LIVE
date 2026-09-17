CREATE TABLE glow_dimension_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES glow_assessments(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('radiance', 'hydration_appearance', 'evenness', 'texture', 'under_eye_appearance', 'overall_vitality')),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  status TEXT NOT NULL CHECK (status IN ('STRENGTH', 'DEVELOPING', 'FOCUS', 'PRIORITY')),
  observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, dimension)
)