-- AlterTable
ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "fxRates" JSON NOT NULL DEFAULT '{"USD":1,"CNY":7.25,"EUR":0.92,"GBP":0.79}';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "shippingCostCny" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "unitCostCny" DECIMAL(12,2) NOT NULL DEFAULT 0;
