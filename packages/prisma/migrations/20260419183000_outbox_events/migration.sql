-- Outbox transacional (eventos de domínio → EventEmitter / realtime)

CREATE TYPE "outbox_event_status" AS ENUM ('pending', 'dispatching', 'processed', 'failed');

CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "tenant_id" UUID,
    "status" "outbox_event_status" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");
