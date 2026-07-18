-- AlterEnum (PG-safe: works without IF NOT EXISTS)
DO $$ BEGIN
  ALTER TYPE "ShippingMethod" ADD VALUE 'LOCAL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "ShippingTerms" ADD VALUE 'LOCAL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
