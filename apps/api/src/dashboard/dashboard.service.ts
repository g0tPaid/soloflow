import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus } from '@flowbooks/database';
import { parseFxRates, roundMoney, toUsd, usdToCny } from '@flowbooks/shared';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(organizationId: string) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const rates = parseFxRates(settings?.fxRates);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [paidInvoices, outstandingInvoices, monthInvoices, customerCount, productCount] =
      await Promise.all([
        this.prisma.invoice.findMany({
          where: {
            organizationId,
            status: InvoiceStatus.PAID,
            issueDate: { gte: startOfMonth },
          },
          select: { currency: true, total: true },
        }),
        this.prisma.invoice.findMany({
          where: {
            organizationId,
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
        this.prisma.invoice.findMany({
          where: {
            organizationId,
            issueDate: { gte: startOfMonth },
          },
          select: { currency: true, total: true, totalCost: true },
        }),
        this.prisma.customer.count({ where: { organizationId, isActive: true } }),
        this.prisma.product.count({ where: { organizationId, isActive: true } }),
      ]);

    const sumUsd = (
      rows: Array<{ currency: string; total?: unknown; totalCost?: unknown }>,
      field: 'total' | 'totalCost',
    ) =>
      rows.reduce((sum, row) => {
        const amount = Number(field === 'total' ? row.total : row.totalCost) || 0;
        return sum + toUsd(amount, row.currency || 'USD', rates);
      }, 0);

    const revenueUsd = roundMoney(sumUsd(paidInvoices, 'total'));
    const outstandingUsd = roundMoney(sumUsd(outstandingInvoices, 'total'));
    const expensesUsd = roundMoney(sumUsd(monthInvoices, 'totalCost'));
    const invoiceRevenueUsd = roundMoney(sumUsd(monthInvoices, 'total'));
    const profitUsd = roundMoney(invoiceRevenueUsd - expensesUsd);
    const cashFlowUsd = roundMoney(revenueUsd - expensesUsd);

    return {
      revenue: revenueUsd,
      expenses: expensesUsd,
      profit: profitUsd,
      outstanding: outstandingUsd,
      cashFlow: cashFlowUsd,
      currency: 'USD',
      revenueCny: roundMoney(usdToCny(revenueUsd, rates)),
      expensesCny: roundMoney(usdToCny(expensesUsd, rates)),
      profitCny: roundMoney(usdToCny(profitUsd, rates)),
      outstandingCny: roundMoney(usdToCny(outstandingUsd, rates)),
      cashFlowCny: roundMoney(usdToCny(cashFlowUsd, rates)),
      period: 'month',
      counts: {
        customers: customerCount,
        products: productCount,
      },
    };
  }
}
