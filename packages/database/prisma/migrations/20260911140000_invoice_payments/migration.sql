-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK', 'CARD', 'MOBILE', 'OTHER');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payments_organizationId_idx" ON "payments"("organizationId");
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing Paid invoices already represent a full payment.
UPDATE "invoices"
SET "amountPaid" = "total"
WHERE "status" = 'PAID' AND "amountPaid" = 0;

INSERT INTO "payments" ("id", "organizationId", "invoiceId", "amount", "paidAt", "method", "createdAt", "updatedAt")
SELECT
  'c' || substr(md5(i."id" || ':paid-backfill'), 1, 24),
  i."organizationId",
  i."id",
  i."total",
  COALESCE(i."updatedAt", i."issueDate", i."createdAt"),
  'CASH',
  NOW(),
  NOW()
FROM "invoices" i
WHERE i."status" = 'PAID'
  AND i."total" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "payments" p WHERE p."invoiceId" = i."id"
  );
