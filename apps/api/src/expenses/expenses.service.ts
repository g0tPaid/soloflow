import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseCostsDto } from './dto/expense.dto';
import { normalizePagination } from '../common/pagination';
import { InvoiceStatus } from '@flowbooks/database';
import {
  convertCurrency,
  normalizeCostCurrency,
  parseFxRates,
  roundMoney,
  type FxRates,
} from '@flowbooks/shared';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  private async loadCostSettings(organizationId: string): Promise<{
    rates: FxRates;
    costCurrency: string;
    defaultCurrency: string;
  }> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { fxRates: true, costCurrency: true, currency: true },
    });
    return {
      rates: parseFxRates(settings?.fxRates),
      costCurrency: normalizeCostCurrency(settings?.costCurrency),
      defaultCurrency: settings?.currency || 'USD',
    };
  }

  private async assertUniqueNumber(organizationId: string, number: string) {
    const trimmed = number.trim();
    if (!trimmed) throw new BadRequestException('Invoice number is required');
    const existing = await this.prisma.invoice.findFirst({
      where: { organizationId, number: trimmed },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(`Invoice number "${trimmed}" is already in use`);
    }
    return trimmed;
  }

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

  async create(organizationId: string, dto: CreateExpenseDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId, isActive: true },
      select: { id: true },
    });
    if (!customer) throw new BadRequestException('Customer not found');

    const number = await this.assertUniqueNumber(organizationId, dto.number);
    const { rates, costCurrency, defaultCurrency } = await this.loadCostSettings(organizationId);
    const currency = (dto.currency || defaultCurrency || 'USD').toUpperCase();
    const shipping = Math.max(0, dto.shipping ?? 0);
    const shippingCostCny = Math.max(0, dto.shippingCostCny ?? 0);
    const shippingCost = roundMoney(convertCurrency(shippingCostCny, costCurrency, currency, rates));

    const lineData = dto.items.map((item) => {
      const quantity = Math.max(0, item.quantity);
      const unitPrice = Math.max(0, item.unitPrice);
      const unitCostCny = Math.max(0, item.unitCostCny ?? 0);
      const unitCost = roundMoney(convertCurrency(unitCostCny, costCurrency, currency, rates));
      const name = item.name?.trim() || null;
      const description = item.description?.trim() || name || 'Item';
      return {
        name,
        description,
        quantity,
        unitPrice,
        unitCost,
        unitCostCny,
        taxRate: 0,
        amount: roundMoney(quantity * unitPrice),
        costAmount: roundMoney(quantity * unitCost),
      };
    });

    const subtotal = roundMoney(lineData.reduce((sum, row) => sum + row.amount, 0));
    const total = roundMoney(subtotal + shipping);
    const itemsCost = roundMoney(lineData.reduce((sum, row) => sum + row.costAmount, 0));
    const totalCost = roundMoney(itemsCost + shippingCost);

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        customerId: dto.customerId,
        number,
        status: InvoiceStatus.PAID,
        issueDate: new Date(dto.issueDate),
        currency,
        notes: dto.notes?.trim() || null,
        discount: 0,
        shipping,
        shippingMethod: dto.shippingMethod ?? null,
        shippingTerms: dto.shippingTerms ?? null,
        shippingFromCountry: dto.shippingFromCountry?.trim() || null,
        shippingToCountry: dto.shippingToCountry?.trim() || null,
        shippingCost,
        shippingCostCny,
        subtotal,
        taxAmount: 0,
        total,
        totalCost,
        items: {
          create: lineData.map((row) => ({
            name: row.name,
            description: row.description,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            unitCost: row.unitCost,
            unitCostCny: row.unitCostCny,
            taxRate: row.taxRate,
            amount: row.amount,
            costAmount: row.costAmount,
          })),
        },
      },
      include: {
        customer: true,
        items: { include: { product: true }, orderBy: { id: 'asc' } },
      },
    });

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

    const { rates, costCurrency } = await this.loadCostSettings(organizationId);
    const currency = invoice.currency || 'USD';
    const costById = new Map(dto.items.map((row) => [row.id, row]));

    // unitCostCny / shippingCostCny store amounts in the org's costCurrency
    let shippingCostCny =
      dto.shippingCostCny !== undefined
        ? Math.max(0, dto.shippingCostCny)
        : Number(invoice.shippingCostCny ?? 0);

    let shippingCost: number;
    if (dto.shippingCostCny !== undefined) {
      shippingCost = roundMoney(convertCurrency(shippingCostCny, costCurrency, currency, rates));
    } else if (dto.shippingCost !== undefined) {
      shippingCost = Math.max(0, dto.shippingCost);
      shippingCostCny = roundMoney(convertCurrency(shippingCost, currency, costCurrency, rates));
    } else {
      shippingCost = Number(invoice.shippingCost ?? 0);
      if (!shippingCostCny && shippingCost > 0) {
        shippingCostCny = roundMoney(convertCurrency(shippingCost, currency, costCurrency, rates));
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of invoice.items) {
        const row = costById.get(item.id);
        let unitCost = Number(item.unitCost ?? 0);
        let unitCostCny = Number(item.unitCostCny ?? 0);

        if (row?.unitCostCny !== undefined) {
          unitCostCny = Math.max(0, row.unitCostCny);
          unitCost = roundMoney(convertCurrency(unitCostCny, costCurrency, currency, rates));
        } else if (row?.unitCost !== undefined) {
          unitCost = Math.max(0, row.unitCost);
          unitCostCny = roundMoney(convertCurrency(unitCost, currency, costCurrency, rates));
        } else if (!unitCostCny && unitCost > 0) {
          unitCostCny = roundMoney(convertCurrency(unitCost, currency, costCurrency, rates));
        }

        const quantity = Number(item.quantity);
        const costAmount = roundMoney(quantity * unitCost);

        await tx.invoiceItem.update({
          where: { id: item.id },
          data: { unitCost, unitCostCny, costAmount },
        });
      }

      const updatedItems = await tx.invoiceItem.findMany({ where: { invoiceId: id } });
      const itemsCost = updatedItems.reduce((sum, item) => sum + Number(item.costAmount), 0);
      const totalCost = roundMoney(itemsCost + shippingCost);

      const updated = await tx.invoice.update({
        where: { id },
        data: { shippingCost, shippingCostCny, totalCost },
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
    shippingCostCny?: unknown;
    totalCost: unknown;
    customer: { id: string; name: string } | null;
    items: { costAmount: unknown }[];
  }) {
    const revenue = Number(invoice.total);
    const customerShipping = Number(invoice.shipping ?? 0);
    const shippingCost = Number(invoice.shippingCost ?? 0);
    const shippingCostCny = Number(invoice.shippingCostCny ?? 0);
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
      shippingCostCny,
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
    shippingCostCny?: unknown;
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
      unitCostCny?: unknown;
      taxRate: unknown;
      amount: unknown;
      costAmount: unknown;
      product?: unknown;
    }>;
  }) {
    const revenue = Number(invoice.total);
    const customerShipping = Number(invoice.shipping ?? 0);
    const shippingCost = Number(invoice.shippingCost ?? 0);
    const shippingCostCny = Number(invoice.shippingCostCny ?? 0);
    const itemsCost = invoice.items.reduce((sum, item) => sum + Number(item.costAmount ?? 0), 0);
    const totalCost = Number(invoice.totalCost ?? itemsCost + shippingCost);
    const profit = revenue - totalCost;
    const shippingProfit = customerShipping - shippingCost;

    return {
      ...invoice,
      revenue,
      customerShipping,
      shippingCost,
      shippingCostCny,
      itemsCost,
      totalCost,
      shippingProfit,
      profit,
      marginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
    };
  }
}
