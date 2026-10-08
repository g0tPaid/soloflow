-- Idempotency key for offline invoice create. Nulls stay allowed so existing rows are unchanged.
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_organizationId_clientRequestId_key"
ON "invoices"("organizationId", "clientRequestId");
