import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ExportAccountingController } from './export-accounting.module';
import type { PrismaService } from '../prisma/prisma.service';

const actor = { user: { sub: 'staff1' } };
const empty = () => ({ entries: [], customers: [], suppliers: [], products: [], deals: [], roadmap: [], gates: [], defaultRate: 7.15 });
function fixture(role = 'OWNER', rows: unknown[] = []) {
  const tx = { $queryRaw: jest.fn().mockResolvedValue(rows), $executeRaw: jest.fn().mockResolvedValue(1) };
  const db = { organizationMember: { findUnique: jest.fn().mockResolvedValue({ role, user: { suspendedAt: null } }) }, $queryRaw: jest.fn().mockResolvedValue(rows), $transaction: jest.fn(async (run: (t: typeof tx) => unknown) => run(tx)) };
  const controller = new ExportAccountingController(db as unknown as PrismaService);
  return { controller, db, tx };
}
describe('Exporter Module 2 workspace', () => {
  it('starts empty and reads the requested organization only', async () => {
    const { controller, db } = fixture();
    expect(await controller.get('org1', actor)).toEqual({ revision: 0, data: empty() });
    expect(db.$queryRaw.mock.calls[0][1]).toBe('org1');
  });
  it('rejects disallowed roles before reading or writing', async () => {
    const { controller, db } = fixture('SALES');
    await expect(controller.get('org1', actor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.save('org1', actor, { revision: 0, data: empty() })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('stores an initial revision and writes an audit snapshot in the same transaction', async () => {
    const { controller, tx } = fixture('ACCOUNTANT', [{ revision: 1, data: empty() }]);
    await expect(controller.save('org1', actor, { revision: 0, data: empty() })).resolves.toEqual({ revision: 1, data: empty() });
    expect(tx.$queryRaw.mock.calls[0][1]).toBe('org1');
    expect(tx.$executeRaw.mock.calls[0].slice(1,4)).toEqual(['org1',1,'staff1']);
  });
  it('rejects stale revisions without writing history', async () => {
    const { controller, tx } = fixture();
    await expect(controller.save('org1', actor, { revision: 4, data: empty() })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('rejects invalid transaction currency or rate', async () => {
    const { controller, db } = fixture();
    const data = { ...empty(), entries: [{ id:'a', category:'self_export', currency:'CNY', amount:100, rate:7.15, description:'sale', date:'2026-11-27' }] };
    await expect(controller.save('org1', actor, { revision: 0, data })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

