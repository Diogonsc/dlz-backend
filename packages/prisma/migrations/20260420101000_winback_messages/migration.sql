CREATE TABLE "winback_messages" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "user_id" UUID,
    "phone" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "window_key" TEXT NOT NULL,
    "message_body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'twilio',
    "provider_message_id" TEXT,
    "error_message" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "winback_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "winback_messages_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "winback_messages_idempotency_key_key" ON "winback_messages"("idempotency_key");
CREATE INDEX "winback_messages_store_id_campaign_created_at_idx" ON "winback_messages"("store_id", "campaign", "created_at");
CREATE INDEX "winback_messages_store_id_phone_created_at_idx" ON "winback_messages"("store_id", "phone", "created_at");
