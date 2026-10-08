import { InvoiceStatus } from '@flowbooks/database';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    organizationSettings: { findUnique: jest.fn() },
    invoice: { groupBy: jest.fn() },
    customer: { count: jest.fn() },
    product: { count: jest.fn() },
  };
  const service = new DashboardService(prisma as never);

  const settings = {
    fxRates: { USD: 1, CNY: 7.25, EUR: 0.92 },
    fxEnabled: true,
    dashboardCurrency: 'USD',
    currency: 'USD',
  };

  function monthStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-08T12:00:00.000Z'));
    prisma.organizationSettings.findUnique.mockResolvedValue(settings);
    prisma.customer.count.mockResolvedValue(3);
    prisma.product.count.mockResolvedValue(4);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sums totals per currency and converts them into the dashboard currency', async () => {
    prisma.invoice.groupBy
      .mockResolvedValueOnce([
        { currency: 'USD', _sum: { total: 100 } },
        { currency: 'CNY', _sum: { total: 725 } },
      ])
      .mockResolvedValueOnce([
        { currency: 'USD', _sum: { totalCost: 40 } },
        { currency: 'CNY', _sum: { totalCost: 72.5 } },
      ])
      .mockResolvedValueOnce([
        { currency: 'USD', _sum: { total: 200, amountPaid: 50 } },
        { currency: 'EUR', _sum: { total: 92, amountPaid: 0 } },
      ]);

    const result = await service.getMetrics('org-1');

    const paidWhere = {
      organizationId: 'org-1',
      status: InvoiceStatus.PAID,
      issueDate: { gte: monthStart() },
    };
    expect(prisma.invoice.groupBy).toHaveBeenNthCalledWith(1, {
      by: ['currency'],
      where: { ...paidWhere, customerId: { not: null } },
      _sum: { total: true },
    });
    expect(prisma.invoice.groupBy).toHaveBeenNthCalledWith(2, {
      by: ['currency'],
      where: {
        ...paidWhere,
        OR: [{ customerId: { not: null } }, { vendorId: { not: null } }],
      },
      _sum: { totalCost: true },
    });
    expect(prisma.invoice.groupBy).toHaveBeenNthCalledWith(3, {
      by: ['currency'],
      where: {
        organizationId: 'org-1',
        customerId: { not: null },
        status: {
          in: [
            InvoiceStatus.SENT,
            InvoiceStatus.VIEWED,
            InvoiceStatus.PARTIAL,
            InvoiceStatus.OVERDUE,
          ],
        },
      },
      _sum: { total: true, amountPaid: true },
    });

    expect(result.revenue).toBe(200);
    expect(result.expenses).toBe(50);
    expect(result.profit).toBe(150);
    expect(result.outstanding).toBe(250);
    expect(result.cashFlow).toBe(150);
    expect(result.currency).toBe('USD');
    expect(result.fxEnabled).toBe(true);
    expect(result.secondaryCurrency).toBe('CNY');
    expect(result.revenueSecondary).toBe(1450);
    expect(result.expensesSecondary).toBe(362.5);
    expect(result.profitSecondary).toBe(1087.5);
    expect(result.outstandingSecondary).toBe(1812.5);
    expect(result.cashFlowSecondary).toBe(1087.5);
    expect(result.revenueCny).toBe(1450);
    expect(result.counts).toEqual({ customers: 3, products: 4 });
  });

  it('returns zero totals when groupBy finds no invoices', async () => {
    prisma.invoice.groupBy.mockResolvedValue([]);
    prisma.customer.count.mockResolvedValue(0);
    prisma.product.count.mockResolvedValue(0);

    const result = await service.getMetrics('org-1');

    expect(prisma.invoice.groupBy).toHaveBeenCalledTimes(3);
    expect(result.revenue).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.profit).toBe(0);
    expect(result.outstanding).toBe(0);
    expect(result.cashFlow).toBe(0);
    expect(result.revenueSecondary).toBe(0);
    expect(result.outstandingSecondary).toBe(0);
    expect(result.counts).toEqual({ customers: 0, products: 0 });
  });

  it('keeps only the dashboard currency when FX is disabled', async () => {
    prisma.organizationSettings.findUnique.mockResolvedValue({
      ...settings,
      fxEnabled: false,
    });
    prisma.invoice.groupBy
      .mockResolvedValueOnce([
        { currency: 'USD', _sum: { total: 80 } },
        { currency: 'CNY', _sum: { total: 725 } },
      ])
      .mockResolvedValueOnce([
        { currency: 'USD', _sum: { totalCost: 30 } },
        { currency: 'EUR', _sum: { totalCost: 10 } },
      ])
      .mockResolvedValueOnce([
        { currency: 'USD', _sum: { total: 40, amountPaid: 10 } },
        { currency: 'CNY', _sum: { total: 100, amountPaid: 0 } },
      ]);

    const result = await service.getMetrics('org-1');

    expect(result.fxEnabled).toBe(false);
    expect(result.revenue).toBe(80);
    expect(result.expenses).toBe(30);
    expect(result.outstanding).toBe(30);
    expect(result.secondaryCurrency).toBeNull();
    expect(result.revenueSecondary).toBeNull();
  });
});
