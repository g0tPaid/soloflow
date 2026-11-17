ALTER TABLE "customers" ADD COLUMN "isDropshipper" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "invoices"
  ADD COLUMN "partnerOrderNumber" TEXT,
  ADD COLUMN "endRecipientName" TEXT,
  ADD COLUMN "endRecipientAddress" TEXT,
  ADD COLUMN "shipmentCarrier" TEXT;

CREATE TABLE "dropship_portals" (
  "customerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dropship_portals_pkey" PRIMARY KEY ("customerId"),
  CONSTRAINT "dropship_portals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "dropship_portals_tokenHash_key" ON "dropship_portals"("tokenHash");
