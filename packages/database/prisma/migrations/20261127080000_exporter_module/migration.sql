-- Additive only: no existing accounting tables are altered.
CREATE TABLE "exporter_profiles" (
  "organizationId" TEXT PRIMARY KEY, "data" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "exporter_directory" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "kind" TEXT NOT NULL, "name" TEXT NOT NULL,
  "data" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "exporter_directory_organizationId_kind_idx" ON "exporter_directory"("organizationId", "kind");
CREATE TABLE "exporter_orders" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "number" TEXT NOT NULL, "data" JSONB NOT NULL, "parties" JSONB NOT NULL,
  "sample" BOOLEAN NOT NULL DEFAULT false, "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("organizationId", "number"), UNIQUE ("organizationId", "id")
);
CREATE TABLE "exporter_documents" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "number" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organizationId", "number"),
  FOREIGN KEY ("organizationId", "orderId") REFERENCES "exporter_orders"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "exporter_documents_organizationId_orderId_idx" ON "exporter_documents"("organizationId", "orderId");
CREATE TABLE "exporter_payments" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("organizationId", "orderId") REFERENCES "exporter_orders"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "exporter_payments_organizationId_orderId_idx" ON "exporter_payments"("organizationId", "orderId");
CREATE TABLE "exporter_attachments" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "category" TEXT NOT NULL,
  "filename" TEXT NOT NULL, "contentType" TEXT NOT NULL, "content" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("organizationId", "orderId") REFERENCES "exporter_orders"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "exporter_attachments_organizationId_orderId_idx" ON "exporter_attachments"("organizationId", "orderId");
CREATE TABLE "exporter_sequences" (
  "organizationId" TEXT NOT NULL, "kind" TEXT NOT NULL, "next" INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY ("organizationId", "kind")
);
CREATE TABLE "exporter_audit" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "recordId" TEXT NOT NULL, "data" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "exporter_audit_organizationId_recordId_createdAt_idx" ON "exporter_audit"("organizationId", "recordId", "createdAt");
