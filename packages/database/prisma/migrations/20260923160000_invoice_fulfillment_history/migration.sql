-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FulfillmentHistoryAction" AS ENUM ('ON', 'OFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "invoice_fulfillment_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "status" "FulfillmentStatus" NOT NULL,
    "action" "FulfillmentHistoryAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_fulfillment_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "invoice_fulfillment_events_invoiceId_createdAt_idx" ON "invoice_fulfillment_events"("invoiceId", "createdAt");
CREATE INDEX IF NOT EXISTS "invoice_fulfillment_events_organizationId_idx" ON "invoice_fulfillment_events"("organizationId");

DO $$ BEGIN
  ALTER TABLE "invoice_fulfillment_events" ADD CONSTRAINT "invoice_fulfillment_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "invoice_fulfillment_events" ADD CONSTRAINT "invoice_fulfillment_events_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
