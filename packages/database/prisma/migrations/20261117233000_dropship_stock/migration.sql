ALTER TABLE "dropship_portals" ADD COLUMN IF NOT EXISTS "linkNonce" TEXT;

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "shipmentWeightKg" DECIMAL(10,3);

CREATE TABLE IF NOT EXISTS "dropship_stock" (
    "customerId" TEXT NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "allocated" DECIMAL(12,4) NOT NULL,
    PRIMARY KEY ("customerId","productId"),
    CHECK ("allocated" >= 0)
  );
