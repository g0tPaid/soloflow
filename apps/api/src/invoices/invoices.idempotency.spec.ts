import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

const item = { description: 'Widget', quantity: 2, unitPrice: 10 };

describe('InvoicesService idempotent create', () => {
  const settings = { invoicePrefix: 'INV', invoiceNextNum: 7, currency: 'AED' };
  const created = {
    id: 'inv_server',
    organizationId: 'org_1',
    number: 'INV-00007',
    clientRequestId: 'client-key-1',
  };

  const tx = {
    invoice: { create: jest.fn() },
    organizationSettings: { upsert: jest.fn() },
  };

  const prisma = {
    organizationSettings: { findUnique: jest.fn() },
    invoice: { findFirst: jest.fn() },
    product: { findMany: jest.fn() },
    $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };

  const service = new InvoicesService(prisma as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
    prisma.organizationSettings.findUnique.mockResolvedValue(settings);
    prisma.invoice.findFirst.mockResolvedValue(null);
    tx.invoice.create.mockImplementation(async ({ data }: { data: { number: string; clientRequestId: string | null } }) => ({
      ...created,
      number: data.number,
      clientRequestId: data.clientRequestId,
    }));
    tx.organizationSettings.upsert.mockResolvedValue({});
  });

  it('creates an invoice without a client key and still assigns the next number', async () => {
    const invoice = await service.create('org_1', { customerId: 'cus_1', items: [item] });

    expect(invoice).toMatchObject({ number: 'INV-00007', clientRequestId: null });
    expect(tx.organizationSettings.upsert).toHaveBeenCalledTimes(1);
  });

  it('stores a client key and keeps an explicit invoice number', async () => {
    await service.create('org_1', {
      customerId: 'cus_1',
      number: 'INV-9',
      clientRequestId: 'client-key-1',
      items: [item],
    });

    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          number: 'INV-9',
          clientRequestId: 'client-key-1',
        }),
      }),
    );
  });

  it('returns the original invoice when the same client key is sent again', async () => {
    prisma.invoice.findFirst.mockImplementation(async ({ where }: { where: { clientRequestId?: string } }) => {
      if (where.clientRequestId === 'client-key-1') return created;
      return null;
    });

    const invoice = await service.create('org_1', {
      customerId: 'cus_1',
      clientRequestId: 'client-key-1',
      items: [item],
    });

    expect(invoice).toBe(created);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.organizationSettings.upsert).not.toHaveBeenCalled();
  });

  it('returns the original invoice when a concurrent create hits the unique key', async () => {
    let lookups = 0;
    prisma.invoice.findFirst.mockImplementation(async ({ where }: { where: { clientRequestId?: string } }) => {
      if (!where.clientRequestId) return null;
      lookups += 1;
      return lookups >= 2 ? created : null;
    });
    prisma.$transaction.mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['organizationId', 'clientRequestId'] },
      }),
    );

    const invoice = await service.create('org_1', {
      customerId: 'cus_1',
      clientRequestId: 'client-key-1',
      items: [item],
    });

    expect(invoice).toBe(created);
    expect(tx.organizationSettings.upsert).not.toHaveBeenCalled();
  });

  it('ignores a provisional number and lets the server assign the next one', async () => {
    const invoice = await service.create('org_1', {
      customerId: 'cus_1',
      number: 'Pending',
      clientRequestId: 'client-key-2',
      items: [item],
    });

    expect(invoice).toMatchObject({ number: 'INV-00007', clientRequestId: 'client-key-2' });
  });

  it('still reports a duplicate invoice number when no client key matches', async () => {
    prisma.$transaction.mockRejectedValue(new Error('Unique constraint failed on number'));

    await expect(
      service.create('org_1', { customerId: 'cus_1', number: 'INV-9', items: [item] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create('org_1', { customerId: 'cus_1', number: 'INV-9', items: [item] }),
    ).rejects.toThrow('Invoice number already exists');
  });
});
