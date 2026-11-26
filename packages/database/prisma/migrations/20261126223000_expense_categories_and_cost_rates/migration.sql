-- Add per-invoice exchange-rate snapshots and separately tracked business expenses.
ALTER TABLE "invoices" ADD COLUMN "costRateCurrency" TEXT,
ADD COLUMN "costRateCny" DECIMAL(14,6);

CREATE TABLE "operating_expenses" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "payee" TEXT,
  "reference" TEXT,
  "notes" TEXT,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operating_expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_expenses_organizationId_category_expenseDate_idx" ON "operating_expenses"("organizationId", "category", "expenseDate");
ALTER TABLE "operating_expenses" ADD CONSTRAINT "operating_expenses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
