-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FulfillmentStatus" AS ENUM (
    'LOCAL_ORDERING_COMPLETED',
    'QC_COMPLETED',
    'SHIPPED_TO_CHINA_CENTER',
    'SHIPPED_INTERNATIONAL',
    'CUSTOMER_RECEIVED',
    'ORDER_COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "fulfillmentStatus" "FulfillmentStatus";
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "localTrackingNumber" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "internationalTrackingNumber" TEXT;

CREATE INDEX IF NOT EXISTS "invoices_organizationId_fulfillmentStatus_idx" ON "invoices"("organizationId", "fulfillmentStatus");
