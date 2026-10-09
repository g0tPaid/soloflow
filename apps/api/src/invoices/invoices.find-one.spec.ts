import { NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

describe('InvoicesService findOne', () => {
  const invoice = {
    id: 'inv_1',
    organizationId: 'org_1',
    customer: { id: 'cus_1', name: 'Ada' },
    items: [
      { id: 'line_1', productId: 'prod_ok', sortOrder: 1 },
      { id: 'line_2', productId: 'prod_missing', sortOrder: 0 },
      { id: 'line_3', productId: null, sortOrder: 2 },
    ],
    payments: [],
    fulfillmentEvents: [],
  };

  const prisma = {
    invoice: { findFirst: jest.fn() },
    product: { findMany: jest.fn() },
    ensureRequiredSchema: jest.fn(),
  };
  const service = new InvoicesService(prisma as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.ensureRequiredSchema.mockResolvedValue(undefined);
    prisma.product.findMany.mockResolvedValue([{ id: 'prod_ok', name: 'Widget' }]);
  });

  it('attaches products in a second query so an orphan productId does not 500', async () => {
    prisma.invoice.findFirst.mockResolvedValue(invoice);

    const result = await service.findOne('org_1', 'inv_1');

    const include = prisma.invoice.findFirst.mock.calls[0][0].include as {
      items: { include?: unknown; orderBy?: unknown };
    };
    expect(include.items.include).toBeUndefined();
    expect(include.items).toEqual({ orderBy: { sortOrder: 'asc' } });
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['prod_ok', 'prod_missing'] } },
    });
    expect(result.items.map((item: { product: unknown }) => item.product)).toEqual([
      { id: 'prod_ok', name: 'Widget' },
      null,
      null,
    ]);
    expect(prisma.ensureRequiredSchema).not.toHaveBeenCalled();
  });

  it('repairs the schema and retries the ordered detail query', async () => {
    prisma.invoice.findFirst.mockRejectedValueOnce(new Error('column missing')).mockResolvedValueOnce(invoice);

    const result = await service.findOne('org_1', 'inv_1');

    expect(prisma.ensureRequiredSchema).toHaveBeenCalledTimes(1);
    expect(prisma.invoice.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.invoice.findFirst.mock.calls[1][0].include.items).toEqual({
      orderBy: { sortOrder: 'asc' },
    });
    expect(result.id).toBe('inv_1');
    expect(result.items[0].product).toEqual({ id: 'prod_ok', name: 'Widget' });
  });

  it('retries with unordered includes when the ordered read still fails', async () => {
    prisma.invoice.findFirst
      .mockRejectedValueOnce(new Error('sortOrder missing'))
      .mockRejectedValueOnce(new Error('sortOrder missing'))
      .mockResolvedValueOnce(invoice);

    await service.findOne('org_1', 'inv_1');

    expect(prisma.ensureRequiredSchema).toHaveBeenCalledTimes(1);
    expect(prisma.invoice.findFirst).toHaveBeenCalledTimes(3);
    expect(prisma.invoice.findFirst.mock.calls[2][0].include).toEqual({
      customer: true,
      items: true,
      payments: true,
      fulfillmentEvents: true,
    });
  });

  it('does not repair the schema when the invoice is missing', async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);

    await expect(service.findOne('org_1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.ensureRequiredSchema).not.toHaveBeenCalled();
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
});
