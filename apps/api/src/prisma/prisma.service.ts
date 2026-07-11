import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@flowbooks/database';

/**
 * Idempotent ALTERs matching packages/database/prisma/migrations.
 * Covers production DBs where migrate history was marked applied (or skipped)
 * but columns were never added — the failure mode behind login 500s on /organizations.
 */
const REQUIRED_SCHEMA_STATEMENTS = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3)`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3)`,
  `ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "fxRates" JSON NOT NULL DEFAULT '{"USD":1,"CNY":7.25,"EUR":0.92,"GBP":0.79}'`,
  `ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "costCurrency" TEXT NOT NULL DEFAULT 'CNY'`,
  `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "shippingCostCny" DECIMAL(12,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "unitCostCny" DECIMAL(12,2) NOT NULL DEFAULT 0`,
] as const;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureRequiredSchema();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureRequiredSchema() {
    for (const sql of REQUIRED_SCHEMA_STATEMENTS) {
      try {
        await this.$executeRawUnsafe(sql);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Fresh DBs may not have tables yet; migrate deploy / db push creates them.
        this.logger.warn(`Schema ensure skipped: ${message}`);
      }
    }
  }
}
