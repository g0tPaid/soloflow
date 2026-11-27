import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseCostsDto, CreateOperatingExpenseDto, OPERATING_EXPENSE_CATEGORIES } from './dto/expense.dto';
import { normalizePagination } from '../common/pagination';
import { InvoiceStatus, Prisma } from '@flowbooks/database';
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
    fxEnabled: boolean;
  }> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { fxRates: true, costCurrency: true, currency: true, fxEnabled: true },
    });
    return {
      rates: parseFxRates(settings?.fxRates),
      costCurrency: normalizeCostCurrency(settings?.costCurrency),
      defaultCurrency: settings?.currency || 'USD',
      fxEnabled: settings?.fxEnabled !== false,
    };
  }

  private convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: FxRates,
    fxEnabled: boolean,
  ) {
    if (!fxEnabled) return roundMoney(amount);
    return roundMoney(convertCurrency(amount, fromCurrency, toCurrency, rates));
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

  async findAll(organizationId: string, page?: number, limit?: number, search?: string) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(page, limit);

    const term = search?.trim().slice(0, 200);
    const contains = { contains: term, mode: 'insensitive' as const };
    const where: Prisma.InvoiceWhereInput = { organizationId, ...(term ? { OR: [
      { number: contains }, { notes: contains }, { customer: { name: contains } },
      { vendor: { name: contains } }, { items: { some: { OR: [{ name: contains }, { description: contains }] } } },
      { partnerOrderNumber: contains }, { endRecipientName: contains },
    ] } : {}) };
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
          items: { select: { costAmount: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
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

  async listOperating(organizationId: string, page?: number, limit?: number, category?: string, search?: string) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(page, limit);
    if (category && !OPERATING_EXPENSE_CATEGORIES.some((value) => value === category)) throw new BadRequestException('Invalid expense category');
    const term = search?.trim().slice(0, 200);
    const contains = { contains: term, mode: 'insensitive' as const };
    const where: Prisma.OperatingExpenseWhereInput = { organizationId, ...(category ? { category } : {}), ...(term ? { OR: [
      { description: contains }, { payee: contains }, { reference: contains }, { notes: contains },
    ] } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.operatingExpense.findMany({ where, skip, take: limitNum, orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.operatingExpense.count({ where }),
    ]);
    return { data: rows.map((row) => ({ ...row, amount: Number(row.amount) })), pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } };
  }

  private operatingExpenseData(dto: CreateOperatingExpenseDto) {
    const description = dto.description.trim();
    if (!description || !/^[A-Z]{3}$/.test(dto.currency.toUpperCase()) || dto.amount >= 10000000000) throw new BadRequestException('Enter a valid description, currency and amount');
    return {
      category: dto.category, description, payee: dto.payee?.trim() || null,
      reference: dto.reference?.trim() || null, notes: dto.notes?.trim() || null,
      expenseDate: new Date(dto.expenseDate), currency: dto.currency.toUpperCase(), amount: dto.amount,
    };
  }

  async createOperating(organizationId: string, dto: CreateOperatingExpenseDto) {
    const row = await this.prisma.operatingExpense.create({ data: { organizationId, ...this.operatingExpenseData(dto) } });
    return { ...row, amount: Number(row.amount) };
  }

  async updateOperating(organizationId: string, id: string, dto: CreateOperatingExpenseDto) {
    const data = this.operatingExpenseData(dto);
    try {
      const row = await this.prisma.operatingExpense.update({ where: { id, organizationId }, data });
      return { ...row, amount: Number(row.amount) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Expense not found');
      }
      throw error;
    }
  }

  async findOne(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        vendor: true,
        items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.toExpenseDetail(invoice);
  }

  async create(organizationId: string, dto: CreateExpenseDto) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, organizationId, isActive: true },
      select: { id: true },
    });
    if (!vendor) throw new BadRequestException('Vendor not found');

    const number = await this.assertUniqueNumber(organizationId, dto.number);
    const { rates, costCurrency, defaultCurrency, fxEnabled } = await this.loadCostSettings(organizationId);
    const currency = (dto.currency || defaultCurrency || 'USD').toUpperCase();
    const shipping = Math.max(0, dto.shipping ?? 0);
    const shippingCostCny = Math.max(0, dto.shippingCostCny ?? 0);
    const shippingCost = this.convertAmount(
      shippingCostCny,
      costCurrency,
      currency,
      rates,
      fxEnabled,
    );

    const lineData = dto.items.map((item) => {
      const quantity = Math.max(0, item.quantity);
      const unitPrice = Math.max(0, item.unitPrice);
      const unitCostCny = Math.max(0, item.unitCostCny ?? 0);
      const unitCost = this.convertAmount(
        unitCostCny,
        costCurrency,
        currency,
        rates,
        fxEnabled,
      );
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
    const inputTaxRate = Math.max(0, Math.min(100, Number(dto.inputTaxRate) || 0));
    const inputTaxAmount =
      inputTaxRate > 0 ? roundMoney(totalCost * (inputTaxRate / 100)) : 0;

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        customerId: null,
        vendorId: dto.vendorId,
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
        taxRate: 0,
        inputTaxRate,
        inputTaxAmount,
        total,
        totalCost,
        items: {
          create: lineData.map((row, index) => ({
            name: row.name,
            description: row.description,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            unitCost: row.unitCost,
            unitCostCny: row.unitCostCny,
            taxRate: row.taxRate,
            amount: row.amount,
            costAmount: row.costAmount,
            sortOrder: index,
          })),
        },
      },
      include: {
        customer: true,
        vendor: true,
        items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
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

    const { rates: baseRates, costCurrency, fxEnabled: orgFxEnabled } = await this.loadCostSettings(organizationId);
    const currency = invoice.currency || 'USD';
    const costRateCurrency = (dto.costRateCurrency ?? invoice.costRateCurrency ?? '').toUpperCase();
    const costRateCny = Number(dto.costRateCny ?? invoice.costRateCny ?? 0);
    const manual = costRateCny > 0 && costRateCurrency !== 'CNY' && Boolean(baseRates[costRateCurrency]);
    if ((dto.costRateCurrency !== undefined || dto.costRateCny !== undefined) && (!manual || costRateCny >= 100000000)) throw new BadRequestException('Enter a valid currency and positive CNY exchange rate');
    const rates = manual ? { ...baseRates, CNY: costRateCny * baseRates[costRateCurrency] } : baseRates;
    const fxEnabled = manual || orgFxEnabled;
    const costById = new Map(dto.items.map((row) => [row.id, row]));

    // unitCostCny / shippingCostCny store amounts in the org's costCurrency
    let shippingCostCny =
      dto.shippingCostCny !== undefined
        ? Math.max(0, dto.shippingCostCny)
        : Number(invoice.shippingCostCny ?? 0);

    let shippingCost: number;
    if (dto.shippingCostCny !== undefined) {
      shippingCost = this.convertAmount(
        shippingCostCny,
        costCurrency,
        currency,
        rates,
        fxEnabled,
      );
    } else if (dto.shippingCost !== undefined) {
      shippingCost = Math.max(0, dto.shippingCost);
      shippingCostCny = this.convertAmount(
        shippingCost,
        currency,
        costCurrency,
        rates,
        fxEnabled,
      );
    } else {
      shippingCost = Number(invoice.shippingCost ?? 0);
      if (!shippingCostCny && shippingCost > 0) {
        shippingCostCny = this.convertAmount(
          shippingCost,
          currency,
          costCurrency,
          rates,
          fxEnabled,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of invoice.items) {
        const row = costById.get(item.id);
        let unitCost = Number(item.unitCost ?? 0);
        let unitCostCny = Number(item.unitCostCny ?? 0);

        if (row?.unitCostCny !== undefined) {
          unitCostCny = Math.max(0, row.unitCostCny);
          unitCost = this.convertAmount(
            unitCostCny,
            costCurrency,
            currency,
            rates,
            fxEnabled,
          );
        } else if (row?.unitCost !== undefined) {
          unitCost = Math.max(0, row.unitCost);
          unitCostCny = this.convertAmount(
            unitCost,
            currency,
            costCurrency,
            rates,
            fxEnabled,
          );
        } else if (!unitCostCny && unitCost > 0) {
          unitCostCny = this.convertAmount(
            unitCost,
            currency,
            costCurrency,
            rates,
            fxEnabled,
          );
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
        data: { shippingCost, shippingCostCny, totalCost, ...(manual ? { costRateCurrency, costRateCny } : {}) },
        include: {
          customer: true,
          vendor: true,
          items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
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
    vendor: { id: string; name: string } | null;
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
      vendor: invoice.vendor,
    };
  }

  private toExpenseDetail(invoice: {
    id: string;
    organizationId: string;
    customerId: string | null;
    vendorId?: string | null;
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
    vendor?: unknown;
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
