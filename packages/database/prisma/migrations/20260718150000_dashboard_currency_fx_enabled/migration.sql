-- Dashboard display currency + exchange-rates toggle
ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "dashboardCurrency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "fxEnabled" BOOLEAN NOT NULL DEFAULT true;
