import { DATA_BACKFILL_STATEMENTS, REQUIRED_SCHEMA_STATEMENTS } from './prisma.service';

describe('boot schema repair', () => {
  it('adds payments.voidedAt before any boot query could select it, and the old backfill does not require the column', () => {
    const alter = REQUIRED_SCHEMA_STATEMENTS.find((sql) => sql.includes('"voidedAt"'));
    expect(alter).toContain('ADD COLUMN IF NOT EXISTS "voidedAt"');
    expect(alter).toContain('TIMESTAMP(3)');
    expect(alter).not.toContain('NOT NULL');

    const backfill = DATA_BACKFILL_STATEMENTS.find((sql) => sql.includes('INSERT INTO "payments"'));
    expect(backfill).toBeTruthy();
    expect(backfill).not.toContain('voidedAt');
    expect(REQUIRED_SCHEMA_STATEMENTS.indexOf(alter!)).toBeGreaterThan(-1);
  });
});
