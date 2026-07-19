import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@flowbooks/database';

/**
 * Idempotent ALTERs matching packages/database/prisma/migrations.
 * Covers production DBs where migrate history was marked applied (or skipped)
 * but columns/enums were never added — the failure mode behind login 500s and
 * invoice create 500s.
 */
const REQUIRED_SCHEMA_STATEMENTS = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3)`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3)`,
  `ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "fxRates" JSON NOT NULL DEFAULT '{"USD":1,"CNY":7.25,"EUR":0.92,"GBP":0.79}'`,
  `ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "costCurrency" TEXT NOT NULL DEFAULT 'CNY'`,
  `ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "dashboardCurrency" TEXT NOT NULL DEFAULT 'USD'`,
  `ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "fxEnabled" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "quotePrefix" TEXT NOT NULL DEFAULT 'QUO'`,
  `ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "quoteNextNum" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "shippingCostCny" DECIMAL(12,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "inputTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "inputTaxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "vendorId" TEXT`,
  `ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "unitCostCny" DECIMAL(12,2) NOT NULL DEFAULT 0`,
  `DO $$ BEGIN ALTER TYPE "ShippingMethod" ADD VALUE 'LOCAL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TYPE "ShippingTerms" ADD VALUE 'LOCAL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "vendors" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "address" JSONB NOT NULL DEFAULT '{}',
    "taxId" TEXT,
    "notes" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "vendors_organizationId_idx" ON "vendors"("organizationId")`,
  `CREATE INDEX IF NOT EXISTS "vendors_organizationId_email_idx" ON "vendors"("organizationId", "email")`,
  `DO $$ BEGIN
    ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "invoices" ALTER COLUMN "customerId" DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL; END $$`,
  `CREATE INDEX IF NOT EXISTS "invoices_organizationId_vendorId_idx" ON "invoices"("organizationId", "vendorId")`,
  `DO $$ BEGIN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "quotes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingMethod" "ShippingMethod",
    "shippingTerms" "ShippingTerms",
    "shippingFromCountry" TEXT,
    "shippingToCountry" TEXT,
    "notes" TEXT,
    "convertedInvoiceId" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "quote_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "quotes_organizationId_number_key" ON "quotes"("organizationId", "number")`,
  `CREATE INDEX IF NOT EXISTS "quotes_organizationId_idx" ON "quotes"("organizationId")`,
  `CREATE INDEX IF NOT EXISTS "quotes_organizationId_status_idx" ON "quotes"("organizationId", "status")`,
  `CREATE INDEX IF NOT EXISTS "quotes_organizationId_customerId_idx" ON "quotes"("organizationId", "customerId")`,
  `CREATE INDEX IF NOT EXISTS "quote_items_quoteId_idx" ON "quote_items"("quoteId")`,
  `DO $$ BEGIN
    ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "quotes" ADD CONSTRAINT "quotes_convertedInvoiceId_fkey"
      FOREIGN KEY ("convertedInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
] as const;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureRequiredSchema();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureRequiredSchema() {
    for (const sql of REQUIRED_SCHEMA_STATEMENTS) {
      try {
        await this.$executeRawUnsafe(sql);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Fresh DBs may not have tables yet; migrate deploy / db push creates them.
        this.logger.warn(`Schema ensure skipped: ${message}`);
      }
    }
  }
}
