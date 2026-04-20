-- Outbox performance indexes for dispatch/cleanup queries
CREATE INDEX IF NOT EXISTS "outbox_events_status_updated_at_idx"
  ON "outbox_events" ("status", "updated_at");

CREATE INDEX IF NOT EXISTS "outbox_events_status_processed_at_idx"
  ON "outbox_events" ("status", "processed_at");
