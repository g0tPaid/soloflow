import { CustomersService } from './customers.service';

describe('CustomersService activity', () => {
  const prisma = {
    customer: { findFirst: jest.fn() },
    invoice: { groupBy: jest.fn() },
    quote: { findMany: jest.fn(), count: jest.fn() },
  };
  const service = new CustomersService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.customer.findFirst.mockResolvedValue({ id: 'cus_1', organizationId: 'org_1', name: 'Ada' });
    prisma.invoice.groupBy.mockResolvedValue([
      { currency: 'USD', _sum: { total: 100, amountPaid: 25 }, _count: { _all: 2 } },
      { currency: 'CNY', _sum: { total: 80, amountPaid: 80 }, _count: { _all: 1 } },
    ]);
    prisma.quote.findMany.mockResolvedValue([
      { id: 'quo_1', number: 'QUO-00001', status: 'SENT', total: 40, currency: 'USD' },
    ]);
    prisma.quote.count.mockResolvedValue(1);
  });

  it('sums every open invoice in its own currency and lists quotes separately', async () => {
    const activity = await service.activity('org_1', 'cus_1');

    expect(prisma.invoice.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org_1',
          customerId: 'cus_1',
          status: { notIn: ['CANCELLED', 'VOID', 'DRAFT'] },
          NOT: { AND: [{ vendorId: { not: null } }, { customerId: null }] },
        }),
      }),
    );
    expect(prisma.quote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org_1', customerId: 'cus_1' } }),
    );
    expect(activity.balances).toEqual([{ currency: 'USD', balanceDue: 75, invoiceCount: 2 }]);
    expect(activity.quotes).toHaveLength(1);
    expect(activity.quoteCount).toBe(1);
  });

  it('does not read another organization', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);
    await expect(service.activity('org_2', 'cus_1')).rejects.toThrow('Customer not found');
    expect(prisma.invoice.groupBy).not.toHaveBeenCalled();
  });
});
