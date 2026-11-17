CREATE TABLE IF NOT EXISTS "quote_pdf_versions" (
  "quoteId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_pdf_versions_pkey" PRIMARY KEY ("quoteId", "version"),
  CONSTRAINT "quote_pdf_versions_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
