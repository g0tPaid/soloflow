import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateExpenseCostsDto } from './dto/expense.dto';
import { normalizePagination } from '../common/pagination';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, page?: number, limit?: number) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(page, limit);

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { organizationId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          items: { select: { costAmount: true } },
        },
      }),
      this.prisma.invoice.count({ where: { organizationId } }),
    ]);

    const data = invoices.map((invoice) => this.toExpenseSummary(invoice));

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        items: { include: { product: true }, orderBy: { id: 'asc' } },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.toExpenseDetail(invoice);
  }

  async updateCosts(organizationId: string, id: string, dto: UpdateExpenseCostsDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    const itemIds = new Set(invoice.items.map((item) => item.id));
    for (const row of dto.items) {
      if (!itemIds.has(row.id)) {
        throw new BadRequestException(`Line item ${row.id} does not belong to this invoice`);
      }
    }

    const costById = new Map(dto.items.map((row) => [row.id, row.unitCost]));
    const shippingCost =
      dto.shippingCost !== undefined ? Math.max(0, dto.shippingCost) : Number(invoice.shippingCost);

    return this.prisma.$transaction(async (tx) => {
      for (const item of invoice.items) {
        const unitCost = costById.has(item.id) ? costById.get(item.id)! : Number(item.unitCost);
        const quantity = Number(item.quantity);
        const costAmount = quantity * unitCost;

        await tx.invoiceItem.update({
          where: { id: item.id },
          data: { unitCost, costAmount },
        });
      }

      const updatedItems = await tx.invoiceItem.findMany({ where: { invoiceId: id } });
      const itemsCost = updatedItems.reduce((sum, item) => sum + Number(item.costAmount), 0);
      const totalCost = itemsCost + shippingCost;

      const updated = await tx.invoice.update({
        where: { id },
        data: { shippingCost, totalCost },
        include: {
          customer: true,
          items: { include: { product: true }, orderBy: { id: 'asc' } },
        },
      });

      return this.toExpenseDetail(updated);
    });
  }

  private toExpenseSummary(invoice: {
    id: string;
    number: string;
    status: string;
    issueDate: Date;
    dueDate: Date | null;
    currency: string;
    total: unknown;
    shipping: unknown;
    shippingCost?: unknown;
    totalCost: unknown;
    customer: { id: string; name: string } | null;
    items: { costAmount: unknown }[];
  }) {
    const revenue = Number(invoice.total);
    const customerShipping = Number(invoice.shipping ?? 0);
    const shippingCost = Number(invoice.shippingCost ?? 0);
    const itemsCost = invoice.items.reduce((sum, item) => sum + Number(item.costAmount ?? 0), 0);
    const totalCost = Number(invoice.totalCost ?? itemsCost + shippingCost);
    const profit = revenue - totalCost;

    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      revenue,
      customerShipping,
      shippingCost,
      totalCost,
      profit,
      customer: invoice.customer,
    };
  }

  private toExpenseDetail(invoice: {
    id: string;
    organizationId: string;
    customerId: string;
    number: string;
    status: string;
    issueDate: Date;
    dueDate: Date | null;
    currency: string;
    subtotal: unknown;
    taxAmount: unknown;
    shipping: unknown;
    shippingCost?: unknown;
    discount: unknown;
    total: unknown;
    totalCost: unknown;
    shippingMethod: string | null;
    shippingTerms: string | null;
    shippingFromCountry: string | null;
    shippingToCountry: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    customer: unknown;
    items: Array<{
      id: string;
      productId: string | null;
      name: string | null;
      description: string;
      imageUrl: string | null;
      quantity: unknown;
      unitPrice: unknown;
      unitCost: unknown;
      taxRate: unknown;
      amount: unknown;
      costAmount: unknown;
      product?: unknown;
    }>;
  }) {
    const revenue = Number(invoice.total);
    const customerShipping = Number(invoice.shipping ?? 0);
    const shippingCost = Number(invoice.shippingCost ?? 0);
    const itemsCost = invoice.items.reduce((sum, item) => sum + Number(item.costAmount ?? 0), 0);
    const totalCost = Number(invoice.totalCost ?? itemsCost + shippingCost);
    const profit = revenue - totalCost;
    const shippingProfit = customerShipping - shippingCost;

    return {
      ...invoice,
      revenue,
      customerShipping,
      shippingCost,
      itemsCost,
      totalCost,
      shippingProfit,
      profit,
      marginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
    };
  }
}
