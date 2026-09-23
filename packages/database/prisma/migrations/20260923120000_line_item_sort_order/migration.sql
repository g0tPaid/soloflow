-- Preserve the order of invoice and quote line items.

ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "invoice_items_invoiceId_sortOrder_idx" ON "invoice_items"("invoiceId", "sortOrder");
CREATE INDEX IF NOT EXISTS "quote_items_quoteId_sortOrder_idx" ON "quote_items"("quoteId", "sortOrder");

-- Number existing rows by id within each document. The new column defaults to 0,
-- so every current document is still unordered and gets id order. Documents that
-- already have a non-zero sortOrder (startup schema repair, then a save) are left alone.
WITH ranked AS (
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
WHERE items."id" = ranked."id";

WITH ranked AS (
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
WHERE items."id" = ranked."id";
