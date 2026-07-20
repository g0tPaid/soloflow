import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus } from '@flowbooks/database';
import { fromUsd, parseFxRates, roundMoney, toUsd } from '@flowbooks/shared';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(organizationId: string) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const rates = parseFxRates(settings?.fxRates);
    const fxEnabled = settings?.fxEnabled !== false;
    const displayCurrency = (
      settings?.dashboardCurrency ||
      settings?.currency ||
      'USD'
    ).toUpperCase();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [paidSales, paidCostRows, outstandingInvoices, customerCount, productCount] =
      await Promise.all([
        // Revenue: only Paid customer invoices this month
        this.prisma.invoice.findMany({
          where: {
            organizationId,
            status: InvoiceStatus.PAID,
            customerId: { not: null },
            issueDate: { gte: startOfMonth },
          },
          select: { currency: true, total: true },
        }),
        // Expenses: COGS on Paid sales + Paid vendor expenses this month
        this.prisma.invoice.findMany({
          where: {
            organizationId,
            status: InvoiceStatus.PAID,
            issueDate: { gte: startOfMonth },
            OR: [{ customerId: { not: null } }, { vendorId: { not: null } }],
          },
          select: { currency: true, totalCost: true },
        }),
        this.prisma.invoice.findMany({
          where: {
            organizationId,
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
          select: { currency: true, total: true },
        }),
        this.prisma.customer.count({ where: { organizationId, isActive: true } }),
        this.prisma.product.count({ where: { organizationId, isActive: true } }),
      ]);

    const toDisplay = (
      rows: Array<{ currency: string; total?: unknown; totalCost?: unknown }>,
      field: 'total' | 'totalCost',
    ) =>
      rows.reduce((sum, row) => {
        const amount = Number(field === 'total' ? row.total : row.totalCost) || 0;
        const rowCurrency = (row.currency || 'USD').toUpperCase();
        if (!fxEnabled) {
          return rowCurrency === displayCurrency ? sum + amount : sum;
        }
        const usd = toUsd(amount, rowCurrency, rates);
        return sum + fromUsd(usd, displayCurrency, rates);
      }, 0);

    const revenue = roundMoney(toDisplay(paidSales, 'total'));
    const expenses = roundMoney(toDisplay(paidCostRows, 'totalCost'));
    const profit = roundMoney(revenue - expenses);
    const outstanding = roundMoney(toDisplay(outstandingInvoices, 'total'));
    const cashFlow = roundMoney(revenue - expenses);

    let secondaryCurrency: string | null = null;
    let revenueSecondary: number | null = null;
    let expensesSecondary: number | null = null;
    let profitSecondary: number | null = null;
    let outstandingSecondary: number | null = null;
    let cashFlowSecondary: number | null = null;

    if (fxEnabled) {
      secondaryCurrency = displayCurrency === 'USD' ? 'CNY' : 'USD';
      const toSecondary = (amount: number) =>
        roundMoney(
          fromUsd(toUsd(amount, displayCurrency, rates), secondaryCurrency!, rates),
        );
      revenueSecondary = toSecondary(revenue);
      expensesSecondary = toSecondary(expenses);
      profitSecondary = toSecondary(profit);
      outstandingSecondary = toSecondary(outstanding);
      cashFlowSecondary = toSecondary(cashFlow);
    }

    return {
      revenue,
      expenses,
      profit,
      outstanding,
      cashFlow,
      currency: displayCurrency,
      fxEnabled,
      secondaryCurrency,
      revenueSecondary,
      expensesSecondary,
      profitSecondary,
      outstandingSecondary,
      cashFlowSecondary,
      // Legacy CNY fields for older clients when display is USD
      revenueCny: displayCurrency === 'USD' ? revenueSecondary : undefined,
      expensesCny: displayCurrency === 'USD' ? expensesSecondary : undefined,
      profitCny: displayCurrency === 'USD' ? profitSecondary : undefined,
      outstandingCny: displayCurrency === 'USD' ? outstandingSecondary : undefined,
      cashFlowCny: displayCurrency === 'USD' ? cashFlowSecondary : undefined,
      period: 'month',
      counts: {
        customers: customerCount,
        products: productCount,
      },
    };
  }
}
