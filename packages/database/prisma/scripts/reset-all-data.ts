/**
 * Wipes all users, organizations, and business data. Keeps the schema/migrations intact.
 *
 * Usage (from repo root):
 *   DATABASE_URL="postgresql://..." pnpm db:reset-data
 *
 * On Railway: open the Postgres service → Connect → run the same command with the
 * production DATABASE_URL, or use Railway CLI:
 *   railway run --service api pnpm db:reset-data
 */
import { PrismaClient } from '../../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const force = process.env.FORCE_RESET === 'true';
  if (!force) {
    console.error(
      'This deletes ALL users, companies, invoices, and related data.\n' +
        'Re-run with FORCE_RESET=true to confirm.',
    );
    process.exit(1);
  }

  console.log('Resetting SoloFlow data…');

  // Break optional user FK on audit logs before user delete (orgs delete cascades audit rows).
  await prisma.auditLog.updateMany({ data: { userId: null } });

  const [orgs, users] = await prisma.$transaction([
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
    prisma.verificationToken.deleteMany(),
  ]);

  console.log(`Deleted ${orgs.count} organizations and ${users.count} users.`);
  console.log('Database is empty — register a new account to start fresh.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
