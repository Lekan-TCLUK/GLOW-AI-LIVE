DROP INDEX IF EXISTS glow_events_event_id_uq;
CREATE UNIQUE INDEX IF NOT EXISTS glow_events_event_id_uq ON glow_events(event_id);