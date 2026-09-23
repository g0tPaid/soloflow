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
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "trackInventory" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "quantityOnHand" DECIMAL(12,4) NOT NULL DEFAULT 0`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reorderLevel" DECIMAL(12,4) NOT NULL DEFAULT 0`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0`,
  `DO $$ BEGIN
    CREATE TYPE "StockMovementType" AS ENUM ('ADJUSTMENT', 'RECEIVE', 'SALE', 'RETURN');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL DEFAULT 'ADJUSTMENT',
    "quantityChange" DECIMAL(12,4) NOT NULL,
    "quantityAfter" DECIMAL(12,4) NOT NULL,
    "note" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "stock_movements_organizationId_productId_idx" ON "stock_movements"("organizationId", "productId")`,
  `CREATE INDEX IF NOT EXISTS "stock_movements_organizationId_createdAt_idx" ON "stock_movements"("organizationId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "stock_movements_referenceType_referenceId_idx" ON "stock_movements"("referenceType", "referenceId")`,
  `DO $$ BEGIN
    ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK', 'CARD', 'MOBILE', 'OTHER');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "payments_organizationId_idx" ON "payments"("organizationId")`,
  `CREATE INDEX IF NOT EXISTS "payments_invoiceId_idx" ON "payments"("invoiceId")`,
  `CREATE INDEX IF NOT EXISTS "payments_paidAt_idx" ON "payments"("paidAt")`,
  `DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `UPDATE "invoices" SET "amountPaid" = "total" WHERE "status" = 'PAID' AND "amountPaid" = 0`,
  `INSERT INTO "payments" ("id", "organizationId", "invoiceId", "amount", "paidAt", "method", "createdAt", "updatedAt")
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
     AND NOT EXISTS (SELECT 1 FROM "payments" p WHERE p."invoiceId" = i."id")`,
  `CREATE TABLE IF NOT EXISTS "organization_invites" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'EMPLOYEE',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "organization_invites_tokenHash_key" ON "organization_invites"("tokenHash")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "organization_invites_organizationId_email_key" ON "organization_invites"("organizationId", "email")`,
  `CREATE INDEX IF NOT EXISTS "organization_invites_organizationId_idx" ON "organization_invites"("organizationId")`,
  `CREATE INDEX IF NOT EXISTS "organization_invites_email_idx" ON "organization_invites"("email")`,
  `DO $$ BEGIN
    ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invitedById_fkey"
      FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS "invoice_items_invoiceId_sortOrder_idx" ON "invoice_items"("invoiceId", "sortOrder")`,
  `CREATE INDEX IF NOT EXISTS "quote_items_quoteId_sortOrder_idx" ON "quote_items"("quoteId", "sortOrder")`,
  // Only documents whose lines are all still 0. A later save (0, 1, 2, …) must not be rewritten on the next boot.
  `WITH ranked AS (
    SELECT
      i."id",
      ROW_NUMBER() OVER (PARTITION BY i."invoiceId" ORDER BY i."id") - 1 AS "ord"
    FROM "invoice_items" i
    WHERE NOT EXISTS (
      SELECT 1
      FROM "invoice_items" other
      WHERE other."invoiceId" = i."invoiceId"
        AND other."sortOrder" <> 0
    )
  )
  UPDATE "invoice_items" AS items
  SET "sortOrder" = ranked."ord"
  FROM ranked
  WHERE items."id" = ranked."id"
    AND items."sortOrder" IS DISTINCT FROM ranked."ord"`,
  `WITH ranked AS (
    SELECT
      q."id",
      ROW_NUMBER() OVER (PARTITION BY q."quoteId" ORDER BY q."id") - 1 AS "ord"
    FROM "quote_items" q
    WHERE NOT EXISTS (
      SELECT 1
      FROM "quote_items" other
      WHERE other."quoteId" = q."quoteId"
        AND other."sortOrder" <> 0
    )
  )
  UPDATE "quote_items" AS items
  SET "sortOrder" = ranked."ord"
  FROM ranked
  WHERE items."id" = ranked."id"
    AND items."sortOrder" IS DISTINCT FROM ranked."ord"`,
  `DO $$ BEGIN
    CREATE TYPE "FulfillmentStatus" AS ENUM (
      'LOCAL_ORDERING_COMPLETED',
      'QC_COMPLETED',
      'SHIPPED_TO_CHINA_CENTER',
      'SHIPPED_INTERNATIONAL',
      'CUSTOMER_RECEIVED',
      'ORDER_COMPLETED'
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "fulfillmentStatus" "FulfillmentStatus"`,
  `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "localTrackingNumber" TEXT`,
  `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "internationalTrackingNumber" TEXT`,
  `CREATE INDEX IF NOT EXISTS "invoices_organizationId_fulfillmentStatus_idx" ON "invoices"("organizationId", "fulfillmentStatus")`,
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
