ALTER TABLE glow_events ADD COLUMN IF NOT EXISTS event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS glow_events_event_id_uq ON glow_events(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS glow_events_name_created_idx ON glow_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS glow_events_session_created_idx ON glow_events(session_id, created_at DESC);