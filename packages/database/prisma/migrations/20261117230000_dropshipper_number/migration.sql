ALTER TABLE "customers"
  ADD COLUMN "dropshipperNumber" TEXT,
  ADD COLUMN "dropshipperPrefix" TEXT;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "organizationId" ORDER BY "createdAt", "id"
  ) AS number
  FROM "customers"
  WHERE "isDropshipper" = true
)
UPDATE "customers" AS customer
SET "dropshipperNumber" = LPAD((ranked.number % 10000)::TEXT, 4, '0')
FROM ranked
WHERE customer."id" = ranked."id" AND ranked.number <= 10000;

CREATE UNIQUE INDEX "customers_organizationId_dropshipperNumber_key"
  ON "customers"("organizationId", "dropshipperNumber");

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_dropshipper_number_format_check"
    CHECK ("dropshipperNumber" IS NULL OR "dropshipperNumber" ~ '^[0-9]{4}$'),
  ADD CONSTRAINT "customers_dropshipper_number_required_check"
    CHECK (NOT "isDropshipper" OR "dropshipperNumber" IS NOT NULL);
