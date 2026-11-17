ALTER TABLE "dropship_stock" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE TABLE IF NOT EXISTS "dropship_imported_shipments" (
  "customerId" TEXT PRIMARY KEY REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "rows" JSONB NOT NULL
);
