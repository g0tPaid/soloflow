-- AlterTable
ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "costCurrency" TEXT NOT NULL DEFAULT 'CNY';
