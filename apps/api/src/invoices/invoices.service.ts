import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateInvoiceDto, CreatePaymentDto, UpdateInvoiceDto } from './dto/invoice.dto';

import { FulfillmentStatus, InvoiceStatus, PaymentMethod, Prisma, QuoteStatus, StockMovementType } from '@flowbooks/database';
import {
  FULFILLMENT_STATUS_VALUES,
  fulfillmentPressEvents,
  fulfillmentTrackingError,
  invoiceBalanceDue,
  invoiceListFilterCriteria,
  isInvoiceListFilter,
  isProvisionalInvoiceNumber,
  normalizeTrackingNumber,
  readStatusBeforeCancel,
  statusAfterOrderReopen,
  statusAfterPayment,
  toMoneyNumber,
} from '@flowbooks/shared';

import { normalizePagination } from '../common/pagination';

const fulfillmentEventsInclude = {
  orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
};

const invoiceDetailInclude = {
  items: { include: { product: true as const }, orderBy: { sortOrder: 'asc' as const } },
  customer: true,
  payments: { orderBy: { paidAt: 'asc' as const } },
  fulfillmentEvents: fulfillmentEventsInclude,
};

/** List columns only. clientRequestId is omitted so a missing production column cannot 500 the page. */
const invoiceListSelect = {
  id: true,
  organizationId: true,
  customerId: true,
  vendorId: true,
  number: true,
  status: true,
  issueDate: true,
  dueDate: true,
  currency: true,
  subtotal: true,
  taxAmount: true,
  taxRate: true,
  inputTaxRate: true,
  inputTaxAmount: true,
  shipping: true,
  shippingCost: true,
  shippingCostCny: true,
  discount: true,
  total: true,
  amountPaid: true,
  totalCost: true,
  shippingMethod: true,
  shippingTerms: true,
  shippingFromCountry: true,
  shippingToCountry: true,
  fulfillmentStatus: true,
  localTrackingNumber: true,
  internationalTrackingNumber: true,
  notes: true,
  customFields: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true } },
} satisfies Prisma.InvoiceSelect;

const invoiceListSelectWithEvents = {
  ...invoiceListSelect,
  fulfillmentEvents: {
    select: { id: true, status: true, action: true, createdAt: true },
    ...fulfillmentEventsInclude,
  },
} satisfies Prisma.InvoiceSelect;

function invoiceReadInclude(ordered: boolean): Prisma.InvoiceInclude {
  if (!ordered) {
    return {
      customer: true,
      items: true,
      payments: true,
      fulfillmentEvents: true,
    };
  }
  return {
    customer: true,
    items: { orderBy: { sortOrder: 'asc' } },
    payments: { orderBy: { paidAt: 'asc' } },
    fulfillmentEvents: fulfillmentEventsInclude,
  };
}

const ORDER_CANCELLED_ACTION = 'invoice.order_cancelled';
const ORDER_REOPENED_ACTION = 'invoice.order_reopened';

import { InventoryService } from '../inventory/inventory.service';



@Injectable()

export class InvoicesService {

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}



  async findAll(
    organizationId: string,
    page?: number,
    limit?: number,
    fulfillmentStatus?: string,
    sort?: string,
    listFilter?: string,
    customerId?: string,
  ) {

    const { page: pageNum, limit: limitNum, skip } = normalizePagination(page, limit);
    const where: Prisma.InvoiceWhereInput = { organizationId };

    if (fulfillmentStatus === 'NONE') {
      where.fulfillmentStatus = null;
    } else if (fulfillmentStatus) {
      if (!(FULFILLMENT_STATUS_VALUES as readonly string[]).includes(fulfillmentStatus)) {
        throw new BadRequestException('Unknown fulfillment status');
      }
      where.fulfillmentStatus = fulfillmentStatus as FulfillmentStatus;
    }

    if (listFilter) {
      if (!isInvoiceListFilter(listFilter)) {
        throw new BadRequestException('Unknown invoice filter');
      }
      const criteria = invoiceListFilterCriteria(listFilter);
      if (criteria.paymentStatuses) {
        where.status = { in: [...criteria.paymentStatuses] as InvoiceStatus[] };
      } else if (criteria.excludePaymentStatuses?.length) {
        where.status = { notIn: [...criteria.excludePaymentStatuses] as InvoiceStatus[] };
      }
      if (criteria.fulfillmentStatuses) {
        where.fulfillmentStatus = { in: [...criteria.fulfillmentStatuses] };
      }
    }

    const customer = customerId?.trim();
    if (customer) where.customerId = customer;

    if (sort && sort !== 'newest' && sort !== 'fulfillment') {
      throw new BadRequestException('Unknown invoice sort');
    }

    const orderBy: Prisma.InvoiceOrderByWithRelationInput[] =
      sort === 'fulfillment'
        ? [{ fulfillmentStatus: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }];

    const [data, total] = await Promise.all([
      this.loadInvoiceList(where, skip, limitNum, orderBy),
      this.prisma.invoice.count({ where }),
    ]);

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
    const invoice = await this.readInvoice(organizationId, id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.attachProducts(invoice);
  }

  private loadInvoiceList(
    where: Prisma.InvoiceWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.InvoiceOrderByWithRelationInput[],
  ) {
    const query = (withEvents: boolean) =>
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy,
        select: withEvents ? invoiceListSelectWithEvents : invoiceListSelect,
      });

    return this.withSchemaRepair(
      () => query(true),
      () => query(false),
    );
  }

  private readInvoice(organizationId: string, id: string) {
    const where = { id, organizationId };
    const query = (ordered: boolean) =>
      this.prisma.invoice.findFirst({
        where,
        include: invoiceReadInclude(ordered),
      });

    return this.withSchemaRepair(
      () => query(true),
      () => query(false),
    );
  }

  /**
   * Run the primary query, repair schema and retry, then use the fallback query.
   * List fallback drops fulfillmentEvents. Detail fallback drops orderBy.
   */
  private async withSchemaRepair<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      return await primary();
    } catch {
      await this.tryRepairSchema();
      try {
        return await primary();
      } catch {
        return fallback();
      }
    }
  }

  private async tryRepairSchema() {
    if (typeof this.prisma.ensureRequiredSchema !== 'function') return;
    await this.prisma.ensureRequiredSchema();
  }

  private async attachProducts<T extends { items: Array<{ productId: string | null }> }>(invoice: T) {
    const productIds = [
      ...new Set(invoice.items.map((item) => item.productId).filter((id): id is string => !!id)),
    ];
    const products =
      productIds.length > 0
        ? await this.prisma.product.findMany({ where: { id: { in: productIds } } })
        : [];
    const byId = new Map(products.map((product) => [product.id, product]));
    return {
      ...invoice,
      items: invoice.items.map((item) => ({
        ...item,
        product: item.productId ? (byId.get(item.productId) ?? null) : null,
      })),
    };
  }

  async getNextNumber(organizationId: string) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const prefix = settings?.invoicePrefix || 'INV';
    const next = settings?.invoiceNextNum || 1;
    return { number: `${prefix}-${String(next).padStart(5, '0')}` };
  }

  private async assertUniqueNumber(organizationId: string, number: string, excludeId?: string) {
    const trimmed = number.trim();
    if (!trimmed) throw new BadRequestException('Invoice number is required');
    const existing = await this.prisma.invoice.findFirst({
      where: {
        organizationId,
        number: trimmed,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new BadRequestException(`Invoice number "${trimmed}" is already in use`);
    }
    return trimmed;
  }

  private findByClientRequestId(organizationId: string, clientRequestId: string) {
    return this.prisma.invoice.findFirst({
      where: { organizationId, clientRequestId },
      include: { items: { include: { product: true }, orderBy: { sortOrder: 'asc' } }, customer: true },
    });
  }

  async create(organizationId: string, dto: CreateInvoiceDto) {
    const clientRequestId = dto.clientRequestId?.trim() || null;
    if (clientRequestId) {
      const replay = await this.findByClientRequestId(organizationId, clientRequestId);
      if (replay) return replay;
    }

    const settings = await this.prisma.organizationSettings.findUnique({

      where: { organizationId },

    });

    const requestedNumber = dto.number?.trim();
    const number =
      requestedNumber && !isProvisionalInvoiceNumber(requestedNumber)
        ? await this.assertUniqueNumber(organizationId, requestedNumber)
        : `${settings?.invoicePrefix || 'INV'}-${String(settings?.invoiceNextNum || 1).padStart(5, '0')}`;



    const { subtotal, shipping, taxAmount, taxRate, total } = this.calculateTotals(
      dto.items,
      dto.discount || 0,
      dto.shipping || 0,
      dto.taxRate || 0,
    );

    const productIds = [
      ...new Set(dto.items.map((item) => item.productId).filter((id): id is string => !!id)),
    ];
    const productImages = new Map<string, string | null>();
    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { organizationId, id: { in: productIds } },
        select: { id: true, imageUrl: true },
      });
      for (const product of products) {
        productImages.set(product.id, product.imageUrl);
      }
    }



    try {
      return await this.prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.create({
          data: {
            organizationId,
            customerId: dto.customerId,
            clientRequestId,
            number,
            issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            currency: dto.currency || settings?.currency || 'INR',
            notes: dto.notes,
            discount: dto.discount || 0,
            shipping,
            shippingMethod: dto.shippingMethod ?? null,
            shippingTerms: dto.shippingTerms ?? null,
            shippingFromCountry: dto.shippingFromCountry?.trim() || null,
            shippingToCountry: dto.shippingToCountry?.trim() || null,
            subtotal,
            taxRate,
            taxAmount,
            total,
            items: {
              create: dto.items.map((item, index) => {
                const name = item.name?.trim() || null;
                const description = item.description?.trim() || name || 'Item';

                return {
                  productId: item.productId || null,
                  name,
                  description,
                  imageUrl:
                    item.imageUrl ||
                    (item.productId ? productImages.get(item.productId) ?? null : null),
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  taxRate: 0,
                  amount: item.quantity * item.unitPrice,
                  sortOrder: index,
                };
              }),
            },
          },
          include: { items: { include: { product: true }, orderBy: { sortOrder: 'asc' } }, customer: true },
        });



      await tx.organizationSettings.upsert({
        where: { organizationId },
        create: {
          organizationId,
          currency: dto.currency || 'INR',
          invoiceNextNum: 2,
        },
        update: {
          invoiceNextNum: (settings?.invoiceNextNum || 1) + 1,
        },
      });

      return invoice;
      });
    } catch (error) {
      if (clientRequestId) {
        const replay = await this.findByClientRequestId(organizationId, clientRequestId);
        if (replay) return replay;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (clientRequestId && isUniqueTarget(error, 'clientRequestId')) {
        throw new BadRequestException('Invoice sync is already in progress. Retry in a moment.');
      }
      throw new BadRequestException(
        message.includes('Unique constraint')
          ? 'Invoice number already exists. Use a different number.'
          : `Could not create invoice: ${message}`,
      );
    }
  }



  async update(organizationId: string, id: string, dto: UpdateInvoiceDto) {

    const existing = await this.findOne(organizationId, id);



    const discount = dto.discount !== undefined ? dto.discount : Number(existing.discount);

    const shipping = dto.shipping !== undefined ? dto.shipping : Number(existing.shipping);

    const taxRate =
      dto.taxRate !== undefined ? dto.taxRate : Number(existing.taxRate ?? 0);

    const lineItemsForTotals = dto.items?.length
      ? dto.items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      : existing.items.map((item) => ({
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        }));

    const { subtotal, taxAmount, total } = this.calculateTotals(
      lineItemsForTotals,
      discount,
      shipping,
      taxRate,
    );

    const alreadyPaid = toMoneyNumber(existing.amountPaid);
    if (alreadyPaid > total + 0.005) {
      throw new BadRequestException(
        'Invoice total cannot be less than the amount already paid. Increase the total, or wait until payments match.',
      );
    }

    const nextStatusFromLedger =
      alreadyPaid > 0.005 ? statusAfterPayment(total, alreadyPaid) : null;
    const markingPaid =
      dto.status === InvoiceStatus.PAID && existing.status !== InvoiceStatus.PAID;
    const markingUnpaid =
      (dto.status === InvoiceStatus.SENT || dto.status === InvoiceStatus.DRAFT) &&
      (existing.status === InvoiceStatus.PAID || existing.status === InvoiceStatus.PARTIAL);

    const updateData: Prisma.InvoiceUpdateInput = {
      subtotal,
      taxRate,
      taxAmount,
      total,
    };

    if (dto.status && !markingPaid) {
      updateData.status = dto.status as InvoiceStatus;
    } else if (!dto.status && nextStatusFromLedger) {
      updateData.status = nextStatusFromLedger;
    }

    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.discount !== undefined) updateData.discount = dto.discount;

    if (dto.shipping !== undefined) updateData.shipping = dto.shipping;

    if (dto.taxRate !== undefined) updateData.taxRate = dto.taxRate;

    if (dto.shippingMethod !== undefined) updateData.shippingMethod = dto.shippingMethod;

    if (dto.shippingTerms !== undefined) updateData.shippingTerms = dto.shippingTerms;

    if (dto.shippingFromCountry !== undefined) {
      updateData.shippingFromCountry = dto.shippingFromCountry?.trim() || null;
    }

    if (dto.shippingToCountry !== undefined) {
      updateData.shippingToCountry = dto.shippingToCountry?.trim() || null;
    }

    const nextFulfillmentStatus =
      dto.fulfillmentStatus !== undefined ? dto.fulfillmentStatus : existing.fulfillmentStatus;
    const trackingError = fulfillmentTrackingError({
      status: nextFulfillmentStatus,
      localTrackingNumber: dto.localTrackingNumber,
      internationalTrackingNumber: dto.internationalTrackingNumber,
    });
    if (trackingError) throw new BadRequestException(trackingError);

    if (dto.fulfillmentStatus !== undefined) {
      updateData.fulfillmentStatus = dto.fulfillmentStatus;
      const presses = fulfillmentPressEvents(existing.fulfillmentStatus, dto.fulfillmentStatus);
      if (presses.length > 0) {
        updateData.fulfillmentEvents = {
          create: presses.map((press) => ({
            organization: { connect: { id: organizationId } },
            status: press.status,
            action: press.action,
          })),
        };
      }
    }
    if (dto.localTrackingNumber !== undefined) {
      updateData.localTrackingNumber = normalizeTrackingNumber(dto.localTrackingNumber);
    }
    if (dto.internationalTrackingNumber !== undefined) {
      updateData.internationalTrackingNumber = normalizeTrackingNumber(dto.internationalTrackingNumber);
    }

    if (dto.number !== undefined) {
      updateData.number = await this.assertUniqueNumber(organizationId, dto.number, id);
    }

    if (dto.items?.length) {
      const productIds = [
        ...new Set(dto.items.map((item) => item.productId).filter((pid): pid is string => !!pid)),
      ];
      const productImages = new Map<string, string | null>();
      if (productIds.length > 0) {
        const products = await this.prisma.product.findMany({
          where: { organizationId, id: { in: productIds } },
          select: { id: true, imageUrl: true },
        });
        for (const product of products) {
          productImages.set(product.id, product.imageUrl);
        }
      }

      updateData.items = {
        deleteMany: {},
        create: dto.items.map((item, index) => {
          const name = item.name?.trim() || null;
          const description = item.description?.trim() || name || 'Item';

          return {
            productId: item.productId || null,
            name,
            description,
            imageUrl:
              item.imageUrl ||
              (item.productId ? productImages.get(item.productId) ?? null : null),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: 0,
            amount: item.quantity * item.unitPrice,
            sortOrder: index,
          };
        }),
      };
    }



    if (markingPaid) {
      await this.prisma.invoice.update({
        where: { id },
        data: updateData,
      });
      const remaining = invoiceBalanceDue({ total, amountPaid: alreadyPaid });
      if (remaining > 0.005) {
        return this.recordPayment(organizationId, id, { amount: remaining, method: 'CASH' });
      }
      const updated = await this.prisma.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.PAID },
        include: invoiceDetailInclude,
      });
      await this.syncSaleStock(organizationId, existing.status, updated);
      return updated;
    }

    if (markingUnpaid) {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { invoiceId: id, organizationId } });
        return tx.invoice.update({
          where: { id },
          data: { ...updateData, amountPaid: 0, status: dto.status as InvoiceStatus },
          include: invoiceDetailInclude,
        });
      });
      await this.syncSaleStock(organizationId, existing.status, updated);
      return updated;
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: invoiceDetailInclude,
    });

    if (updated.status !== existing.status) {
      await this.syncSaleStock(organizationId, existing.status, updated);
    }

    return updated;
  }

  async cancelOrder(organizationId: string, id: string) {
    const existing = await this.findOne(organizationId, id);
    if (existing.status === InvoiceStatus.VOID) {
      throw new BadRequestException('A void invoice cannot be cancelled this way');
    }
    if (existing.status === InvoiceStatus.CANCELLED) return existing;

    const customFields = {
      ...customFieldsObject(existing.customFields),
      statusBeforeCancel: existing.status,
    };
    const updated = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.CANCELLED, customFields },
        include: invoiceDetailInclude,
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          action: ORDER_CANCELLED_ACTION,
          entityType: 'invoice',
          entityId: id,
          metadata: { previousStatus: existing.status },
        },
      });
      return invoice;
    });
    await this.syncSaleStock(organizationId, existing.status, updated);
    return updated;
  }

  async reopenOrder(organizationId: string, id: string) {
    const existing = await this.findOne(organizationId, id);
    if (existing.status !== InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Only a cancelled order can be reopened');
    }

    const lastCancel = await this.prisma.auditLog.findFirst({
      where: {
        organizationId,
        entityType: 'invoice',
        entityId: id,
        action: ORDER_CANCELLED_ACTION,
      },
      orderBy: { createdAt: 'desc' },
    });
    const previousStatus =
      readStatusBeforeCancel(existing.customFields) ??
      previousStatusFromAudit(lastCancel?.metadata);
    const restored = statusAfterOrderReopen(existing, previousStatus) as InvoiceStatus;
    const customFields = customFieldsObject(existing.customFields);
    delete customFields.statusBeforeCancel;

    const updated = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.update({
        where: { id },
        data: { status: restored, customFields },
        include: invoiceDetailInclude,
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          action: ORDER_REOPENED_ACTION,
          entityType: 'invoice',
          entityId: id,
          metadata: { restoredStatus: restored, previousStatus: previousStatus ?? null },
        },
      });
      return invoice;
    });
    await this.syncSaleStock(organizationId, existing.status, updated);
    return updated;
  }

  async recordPayment(organizationId: string, id: string, dto: CreatePaymentDto) {
    const invoice = await this.findOne(organizationId, id);
    if (invoice.status === InvoiceStatus.VOID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot record a payment on a void or cancelled invoice');
    }

    const amount = toMoneyNumber(dto.amount);
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    const remaining = invoiceBalanceDue(invoice);
    if (remaining <= 0.005) {
      throw new BadRequestException('This invoice is already paid in full');
    }
    if (amount > remaining + 0.01) {
      throw new BadRequestException(
        `Payment exceeds the remaining balance of ${remaining.toFixed(2)}`,
      );
    }

    const applied = Math.min(amount, remaining);
    const nextPaid = toMoneyNumber(toMoneyNumber(invoice.amountPaid) + applied);
    const nextStatus = statusAfterPayment(toMoneyNumber(invoice.total), nextPaid);
    const previousStatus = invoice.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          organizationId,
          invoiceId: id,
          amount: applied,
          paidAt: this.parsePaidAt(dto.paidAt),
          method: (dto.method as PaymentMethod | undefined) || PaymentMethod.CASH,
          note: dto.note?.trim() || null,
        },
      });
      return tx.invoice.update({
        where: { id },
        data: { amountPaid: nextPaid, status: nextStatus },
        include: {
          items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
          customer: true,
          payments: { orderBy: { paidAt: 'asc' } },
        },
      });
    });

    if (updated.status !== previousStatus) {
      await this.syncSaleStock(organizationId, previousStatus, updated);
    }

    return updated;
  }

  /**
   * Move a customer invoice into Quotes: create/reopen a draft quote, restore
   * stock if the invoice was Paid, then delete the invoice so it leaves
   * invoices, reports, receipts, and dashboard totals.
   */
  async convertToQuote(organizationId: string, id: string) {
    const invoice = await this.findOne(organizationId, id);
    if (!invoice.customerId) {
      throw new BadRequestException('Only customer invoices can be converted to a quote');
    }
    if (invoice.items.length === 0) {
      throw new BadRequestException('Invoice has no line items');
    }

    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    const noteSuffix = `Converted from invoice ${invoice.number}`;
    const quoteNotes = invoice.notes
      ? `${invoice.notes}\n\n${noteSuffix}`
      : noteSuffix;

    const quoteItemCreates = invoice.items.map((item, index) => ({
      productId: item.productId,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      amount: item.amount,
      sortOrder: index,
    }));

    const quote = await this.prisma.$transaction(async (tx) => {
      // Undo sale stock if this invoice had already been marked Paid.
      if (invoice.status === InvoiceStatus.PAID && invoice.customerId) {
        for (const item of invoice.items) {
          if (!item.productId) continue;
          const product = await tx.product.findFirst({
            where: {
              id: item.productId,
              organizationId,
              isActive: true,
              trackInventory: true,
            },
          });
          if (!product) continue;
          const change = Number(item.quantity);
          if (!change) continue;
          const nextQty = Number(product.quantityOnHand) + change;
          await tx.product.update({
            where: { id: product.id },
            data: { quantityOnHand: nextQty },
          });
          await tx.stockMovement.create({
            data: {
              organizationId,
              productId: product.id,
              type: StockMovementType.RETURN,
              quantityChange: change,
              quantityAfter: nextQty,
              note: `Stock restored (invoice ${invoice.number} converted to quote)`,
              referenceType: 'invoice',
              referenceId: invoice.id,
            },
          });
        }
      }

      const sourceQuotes = await tx.quote.findMany({
        where: { organizationId, convertedInvoiceId: invoice.id },
        orderBy: { createdAt: 'asc' },
      });

      let resultQuote;

      if (sourceQuotes.length === 1) {
        const sourceId = sourceQuotes[0].id;
        await tx.quoteItem.deleteMany({ where: { quoteId: sourceId } });
        resultQuote = await tx.quote.update({
          where: { id: sourceId },
          data: {
            status: QuoteStatus.DRAFT,
            convertedInvoiceId: null,
            issueDate: invoice.issueDate,
            validUntil: invoice.dueDate,
            currency: invoice.currency,
            notes: quoteNotes,
            discount: invoice.discount,
            shipping: invoice.shipping,
            shippingMethod: invoice.shippingMethod,
            shippingTerms: invoice.shippingTerms,
            shippingFromCountry: invoice.shippingFromCountry,
            shippingToCountry: invoice.shippingToCountry,
            subtotal: invoice.subtotal,
            taxRate: invoice.taxRate,
            taxAmount: invoice.taxAmount,
            total: invoice.total,
            items: { create: quoteItemCreates },
          },
          include: { items: { include: { product: true }, orderBy: { sortOrder: 'asc' } }, customer: true },
        });
      } else {
        if (sourceQuotes.length > 1) {
          await tx.quote.updateMany({
            where: { organizationId, convertedInvoiceId: invoice.id },
            data: { status: QuoteStatus.CANCELLED, convertedInvoiceId: null },
          });
        }

        const quoteNumber = `${settings?.quotePrefix || 'QUO'}-${String(settings?.quoteNextNum || 1).padStart(5, '0')}`;
        resultQuote = await tx.quote.create({
          data: {
            organizationId,
            customerId: invoice.customerId!,
            number: quoteNumber,
            status: QuoteStatus.DRAFT,
            issueDate: new Date(),
            validUntil: invoice.dueDate,
            currency: invoice.currency,
            notes: quoteNotes,
            discount: invoice.discount,
            shipping: invoice.shipping,
            shippingMethod: invoice.shippingMethod,
            shippingTerms: invoice.shippingTerms,
            shippingFromCountry: invoice.shippingFromCountry,
            shippingToCountry: invoice.shippingToCountry,
            subtotal: invoice.subtotal,
            taxRate: invoice.taxRate,
            taxAmount: invoice.taxAmount,
            total: invoice.total,
            items: { create: quoteItemCreates },
          },
          include: { items: { include: { product: true }, orderBy: { sortOrder: 'asc' } }, customer: true },
        });

        await tx.organizationSettings.upsert({
          where: { organizationId },
          create: {
            organizationId,
            currency: invoice.currency || 'INR',
            quoteNextNum: 2,
          },
          update: {
            quoteNextNum: (settings?.quoteNextNum || 1) + 1,
          },
        });
      }

      // Remove invoice so lists, VAT reports, dashboard, and receipts exclude it.
      await tx.invoice.delete({ where: { id: invoice.id } });

      return resultQuote;
    });

    return { quote };
  }

  private parsePaidAt(value?: string) {
    if (!value) return new Date();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T12:00:00`);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return new Date();
    return parsed;
  }

  private async syncSaleStock(
    organizationId: string,
    previousStatus: InvoiceStatus,
    invoice: {
      id: string;
      status: InvoiceStatus;
      customerId: string | null;
      items: { productId: string | null; quantity: Prisma.Decimal | number }[];
    },
  ) {
    await this.inventoryService.syncInvoiceSaleStock(
      organizationId,
      {
        id: invoice.id,
        status: invoice.status,
        customerId: invoice.customerId,
        items: invoice.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
      previousStatus,
    );
  }

  private calculateTotals(
    items: { quantity: number; unitPrice: number }[],
    discount: number,
    shipping: number,
    taxRatePercent = 0,
  ) {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxRate = Math.max(0, Math.min(100, Number(taxRatePercent) || 0));
    const net = Math.max(0, subtotal + shipping - discount);
    const taxAmount =
      taxRate > 0 ? Math.round(net * (taxRate / 100) * 100) / 100 : 0;
    const total = Math.max(0, net + taxAmount);
    return { subtotal, shipping, taxRate, taxAmount, total };
  }
}

function customFieldsObject(value: Prisma.JsonValue | null | undefined): Record<string, Prisma.InputJsonValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, Prisma.InputJsonValue>) };
}

function previousStatusFromAudit(metadata: Prisma.JsonValue | null | undefined): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as { previousStatus?: unknown }).previousStatus;
  return typeof value === 'string' && value.trim() ? value : null;
}

function isUniqueTarget(error: unknown, field: string): boolean {
  if (!error || typeof error !== 'object') return false;
  if ((error as { code?: string }).code !== 'P2002') return false;
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  if (Array.isArray(target)) return target.some((item) => String(item).includes(field));
  if (typeof target === 'string') return target.includes(field);
  return false;
}


