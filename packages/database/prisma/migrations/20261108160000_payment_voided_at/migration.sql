-- Keep a removed payment on the invoice instead of deleting it.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
