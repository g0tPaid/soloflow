-- CreateTable
CREATE TABLE "vendors" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- AlterTable: expenses can use vendor without a customer
ALTER TABLE "invoices" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;

-- CreateIndex
CREATE INDEX "vendors_organizationId_idx" ON "vendors"("organizationId");
CREATE INDEX "vendors_organizationId_email_idx" ON "vendors"("organizationId", "email");
CREATE INDEX "invoices_organizationId_vendorId_idx" ON "invoices"("organizationId", "vendorId");

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
