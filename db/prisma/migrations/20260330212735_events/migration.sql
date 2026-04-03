-- CreateTable
CREATE TABLE "app_events" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT,
    "path" TEXT,
    "properties" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_events_name_created_at_idx" ON "app_events"("name", "created_at" DESC);

-- CreateIndex
CREATE INDEX "app_events_user_id_created_at_idx" ON "app_events"("user_id", "created_at" DESC);
