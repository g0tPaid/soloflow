import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@flowbooks/database';
import { CustomersService } from './customers.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('dropshipper customer IDs', () => {
  const prisma = { customer: { create: jest.fn(), findMany: jest.fn() } };
  const service = new CustomersService(prisma as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());

  it('suggests an unused number from the same organization, preserving zero padding', async () => {
    prisma.customer.findMany.mockResolvedValue([{ dropshipperNumber: '0001' }, { dropshipperNumber: '0003' }]);
    await expect(service.suggestDropshipperNumber('org')).resolves.toEqual({ number: '0002' });
    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org', dropshipperNumber: { not: null } },
    }));
  });

  it('requires four digits when marked as a dropshipper', async () => {
    await expect(service.create('org', { name: 'Partner', isDropshipper: true })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create('org', { name: 'Partner', isDropshipper: true, dropshipperNumber: '123' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });

  it('saves the entered number and uppercases the optional prefix', async () => {
    await service.create('org', { name: 'Partner', isDropshipper: true, dropshipperNumber: '0008', dropshipperPrefix: 'aj2' });
    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Partner', organizationId: 'org', dropshipperNumber: '0008', dropshipperPrefix: 'AJ2' }),
    });
  });

  it('returns a clear conflict if another customer already has the number', async () => {
    prisma.customer.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Duplicate', {
      code: 'P2002', clientVersion: 'test',
    }));
    await expect(service.create('org', { name: 'Partner', isDropshipper: true, dropshipperNumber: '0008' })).rejects.toBeInstanceOf(ConflictException);
  });
});
