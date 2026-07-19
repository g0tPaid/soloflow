-- Purchase / input VAT on invoices (used by UAE VAT-201 reports for expenses)
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "inputTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "inputTaxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
