import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';
import { InvoiceStatus, Prisma, QuoteStatus } from '@flowbooks/database';
import { normalizePagination } from '../common/pagination';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, page?: number, limit?: number) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(page, limit);
    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where: { organizationId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true } } },
      }),
      this.prisma.quote.count({ where: { organizationId } }),
    ]);

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findOne(organizationId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId },
      include: { customer: true, items: { include: { product: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  async getNextNumber(organizationId: string) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const prefix = settings?.quotePrefix || 'QUO';
    const next = settings?.quoteNextNum || 1;
    return { number: `${prefix}-${String(next).padStart(5, '0')}` };
  }

  private async assertUniqueNumber(organizationId: string, number: string, excludeId?: string) {
    const trimmed = number.trim();
    if (!trimmed) throw new BadRequestException('Quote number is required');
    const existing = await this.prisma.quote.findFirst({
      where: {
        organizationId,
        number: trimmed,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new BadRequestException(`Quote number "${trimmed}" is already in use`);
    }
    return trimmed;
  }

  async create(organizationId: string, dto: CreateQuoteDto) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    const number = dto.number?.trim()
      ? await this.assertUniqueNumber(organizationId, dto.number)
      : `${settings?.quotePrefix || 'QUO'}-${String(settings?.quoteNextNum || 1).padStart(5, '0')}`;

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

    const write = () =>
      this.prisma.$transaction(async (tx) => {
        const quote = await tx.quote.create({
          data: {
            organizationId,
            customerId: dto.customerId,
            number,
            issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
            validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
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
                const productId =
                  item.productId && productImages.has(item.productId) ? item.productId : null;
                return {
                  productId,
                  name,
                  description,
                  imageUrl: item.imageUrl || (productId ? productImages.get(productId) ?? null : null),
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
            quoteNextNum: 2,
          },
          update: {
            quoteNextNum: (settings?.quoteNextNum || 1) + 1,
          },
        });

        return quote;
      });

    try {
      return await write();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      await this.tryRepairSchema();
      try {
        return await write();
      } catch (retryError) {
        const message = retryError instanceof Error ? retryError.message : String(retryError);
        throw new BadRequestException(
          message.includes('Unique constraint')
            ? 'Quote number already exists. Use a different number.'
            : `Could not create quote: ${message}`,
        );
      }
    }
  }

  async update(organizationId: string, id: string, dto: UpdateQuoteDto) {
    const existing = await this.findOne(organizationId, id);
    if (existing.status === QuoteStatus.CONVERTED) {
      throw new BadRequestException('This quote was already converted to an invoice');
    }

    const discount = dto.discount !== undefined ? dto.discount : Number(existing.discount);
    const shipping = dto.shipping !== undefined ? dto.shipping : Number(existing.shipping);
    const taxRate = dto.taxRate !== undefined ? dto.taxRate : Number(existing.taxRate ?? 0);

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

    const updateData: Prisma.QuoteUpdateInput = {
      subtotal,
      taxRate,
      taxAmount,
      total,
    };

    if (dto.currency) updateData.currency = dto.currency.trim().toUpperCase();
    if (dto.status) updateData.status = dto.status as QuoteStatus;
    if (dto.validUntil !== undefined) {
      updateData.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    }
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
    if (dto.number !== undefined) {
      updateData.number = await this.assertUniqueNumber(organizationId, dto.number, id);
    }

    const itemRows = dto.items?.length
      ? await this.quoteItemRows(organizationId, id, dto.items)
      : null;

    const write = () =>
      this.prisma.$transaction(async (tx) => {
        if (itemRows) {
          await tx.quoteItem.deleteMany({ where: { quoteId: id } });
          await tx.quoteItem.createMany({ data: itemRows });
        }
        return tx.quote.update({
          where: { id },
          data: updateData,
          include: {
            items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
            customer: true,
          },
        });
      });

    try {
      return await write();
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      await this.tryRepairSchema();
      try {
        return await write();
      } catch (retryError) {
        if (retryError instanceof BadRequestException || retryError instanceof NotFoundException) {
          throw retryError;
        }
        const message = retryError instanceof Error ? retryError.message : String(retryError);
        throw new BadRequestException(`Could not save quote: ${message}`);
      }
    }
  }

  /** Keep the typed line even when the catalog product was deleted. */
  private async quoteItemRows(
    organizationId: string,
    quoteId: string,
    items: NonNullable<UpdateQuoteDto['items']>,
  ) {
    const productIds = [
      ...new Set(items.map((item) => item.productId).filter((pid): pid is string => !!pid)),
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

    return items.map((item, index) => {
      const name = item.name?.trim() || null;
      const description = item.description?.trim() || name || 'Item';
      const productId = item.productId && productImages.has(item.productId) ? item.productId : null;
      return {
        quoteId,
        productId,
        name,
        description,
        imageUrl: item.imageUrl || (productId ? productImages.get(productId) ?? null : null),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: 0,
        amount: item.quantity * item.unitPrice,
        sortOrder: index,
      };
    });
  }

  private async tryRepairSchema() {
    if (typeof this.prisma.ensureRequiredSchema !== 'function') return;
    await this.prisma.ensureRequiredSchema();
  }

  /** Create a draft invoice from this quote and mark the quote CONVERTED. */
  async convertToInvoice(organizationId: string, id: string) {
    const quote = await this.findOne(organizationId, id);
    if (quote.status === QuoteStatus.CONVERTED || quote.convertedInvoiceId) {
      throw new BadRequestException('This quote was already converted to an invoice');
    }
    if (quote.items.length === 0) {
      throw new BadRequestException('Quote has no line items');
    }

    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const invoiceNumber = `${settings?.invoicePrefix || 'INV'}-${String(settings?.invoiceNextNum || 1).padStart(5, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          customerId: quote.customerId,
          number: invoiceNumber,
          status: InvoiceStatus.DRAFT,
          issueDate: new Date(),
          dueDate: quote.validUntil,
          currency: quote.currency,
          notes: quote.notes
            ? `${quote.notes}\n\nConverted from quote ${quote.number}`
            : `Converted from quote ${quote.number}`,
          discount: quote.discount,
          shipping: quote.shipping,
          shippingMethod: quote.shippingMethod,
          shippingTerms: quote.shippingTerms,
          shippingFromCountry: quote.shippingFromCountry,
          shippingToCountry: quote.shippingToCountry,
          subtotal: quote.subtotal,
          taxRate: quote.taxRate,
          taxAmount: quote.taxAmount,
          total: quote.total,
          items: {
            create: quote.items.map((item, index) => ({
              productId: item.productId,
              name: item.name,
              description: item.description,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              amount: item.amount,
              sortOrder: index,
            })),
          },
        },
        include: { items: { include: { product: true }, orderBy: { sortOrder: 'asc' } }, customer: true },
      });

      await tx.organizationSettings.upsert({
        where: { organizationId },
        create: {
          organizationId,
          currency: quote.currency || 'INR',
          invoiceNextNum: 2,
        },
        update: {
          invoiceNextNum: (settings?.invoiceNextNum || 1) + 1,
        },
      });

      const updatedQuote = await tx.quote.update({
        where: { id },
        data: {
          status: QuoteStatus.CONVERTED,
          convertedInvoiceId: invoice.id,
        },
        include: { items: { include: { product: true }, orderBy: { sortOrder: 'asc' } }, customer: true },
      });

      return { quote: updatedQuote, invoice };
    });
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
    const taxAmount = taxRate > 0 ? Math.round(net * (taxRate / 100) * 100) / 100 : 0;
    const total = Math.max(0, net + taxAmount);
    return { subtotal, shipping, taxRate, taxAmount, total };
  }
}
