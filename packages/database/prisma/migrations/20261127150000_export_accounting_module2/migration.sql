CREATE TABLE IF NOT EXISTS "export_accounting_workspaces" (
  "organizationId" TEXT PRIMARY KEY REFERENCES "organizations"("id") ON DELETE CASCADE,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "export_accounting_history" (
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "revision" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("organizationId", "revision")
);

