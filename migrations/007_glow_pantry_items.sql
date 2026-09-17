CREATE TABLE glow_pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES glow_journeys(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('LOOK_FOR', 'USE_WITH_PURPOSE', 'PAUSE', 'OPTIONAL_WELLNESS_SUPPORT')),
  source_action_id TEXT NULL,
  source_dimension TEXT NULL CHECK (source_dimension IS NULL OR source_dimension IN ('radiance', 'hydration_appearance', 'evenness', 'texture', 'under_eye_appearance', 'overall_vitality')),
  selection_reason TEXT NULL,
  archetype_modifier TEXT NULL,
  display_order INTEGER NOT NULL CHECK (display_order >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)