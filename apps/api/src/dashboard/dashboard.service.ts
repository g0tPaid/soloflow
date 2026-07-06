import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus } from '@flowbooks/database';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(organizationId: string) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const currency = settings?.currency || 'USD';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [paidInvoices, outstandingInvoices, customerCount, productCount] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          status: InvoiceStatus.PAID,
          issueDate: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
        },
        _sum: { total: true },
      }),
      this.prisma.customer.count({ where: { organizationId, isActive: true } }),
      this.prisma.product.count({ where: { organizationId, isActive: true } }),
    ]);

    const revenue = Number(paidInvoices._sum.total || 0);
    const outstanding = Number(outstandingInvoices._sum.total || 0);

    return {
      revenue,
      expenses: 0, // Phase 2
      outstanding,
      cashFlow: revenue - 0,
      currency,
      period: 'month',
      counts: {
        customers: customerCount,
        products: productCount,
      },
    };
  }
}
