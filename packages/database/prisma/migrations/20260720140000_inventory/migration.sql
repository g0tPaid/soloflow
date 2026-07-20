-- Inventory tracking on products + stock movement ledger
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "trackInventory" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "quantityOnHand" DECIMAL(12,4) NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reorderLevel" DECIMAL(12,4) NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  CREATE TYPE "StockMovementType" AS ENUM ('ADJUSTMENT', 'RECEIVE', 'SALE', 'RETURN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "stock_movements" (
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
);

CREATE INDEX IF NOT EXISTS "stock_movements_organizationId_productId_idx"
  ON "stock_movements"("organizationId", "productId");
CREATE INDEX IF NOT EXISTS "stock_movements_organizationId_createdAt_idx"
  ON "stock_movements"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "stock_movements_referenceType_referenceId_idx"
  ON "stock_movements"("referenceType", "referenceId");

DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
