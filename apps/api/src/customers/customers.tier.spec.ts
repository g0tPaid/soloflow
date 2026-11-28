import { CustomersService } from './customers.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('customer tier persistence', () => {
  const tx = { $queryRaw: jest.fn(), customer: { update: jest.fn() } };
  const prisma = { customer: { create: jest.fn(), findFirst: jest.fn() }, $transaction: jest.fn() };
  const service = new CustomersService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.customer.findFirst.mockResolvedValue({ id: 'customer' });
    tx.$queryRaw.mockResolvedValue([{ isDropshipper: false, dropshipperNumber: null, customFields: { customerTier: 'BRONZE', existing: 'keep' } }]);
    prisma.$transaction.mockImplementation(callback => callback(tx));
  });
  it('defaults omitted and null tiers to Silver when creating a customer', async () => {
    for (const dto of [{ name: 'Customer' }, { name: 'Customer', customerTier: null }]) {
      await service.create('org', dto);
      expect(prisma.customer.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ customFields: { customerTier: 'SILVER' } }) });
    }
  });
  it('stores the chosen tier when creating a customer', async () => {
    await service.create('org', { name: 'Customer', customerTier: 'GOLD' });
    expect(prisma.customer.create).toHaveBeenCalledWith({ data: expect.objectContaining({ customFields: { customerTier: 'GOLD' } }) });
  });
  it('changes or resets the tier without overwriting other custom fields', async () => {
    await service.update('org', 'customer', { customerTier: 'PLATINUM' });
    expect(tx.customer.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ customFields: { customerTier: 'PLATINUM', existing: 'keep' } }) }));
    await service.update('org', 'customer', { customerTier: null });
    expect(tx.customer.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ customFields: { customerTier: 'SILVER', existing: 'keep' } }) }));
  });
  it('leaves customer tier unchanged for unrelated edits', async () => {
    await service.update('org', 'customer', { name: 'Renamed' });
    expect(tx.customer.update.mock.calls[0][0].data).not.toHaveProperty('customFields');
  });
});
