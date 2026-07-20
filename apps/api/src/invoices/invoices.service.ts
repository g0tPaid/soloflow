import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';

import { InvoiceStatus, Prisma } from '@flowbooks/database';

import { normalizePagination } from '../common/pagination';

import { InventoryService } from '../inventory/inventory.service';



@Injectable()

export class InvoicesService {

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}



  async findAll(organizationId: string, page?: number, limit?: number) {

    const { page: pageNum, limit: limitNum, skip } = normalizePagination(page, limit);

    const [data, total] = await Promise.all([

      this.prisma.invoice.findMany({

        where: { organizationId },

        skip,

        take: limitNum,

        orderBy: { createdAt: 'desc' },

        include: { customer: { select: { id: true, name: true } }, items: true },

      }),

      this.prisma.invoice.count({ where: { organizationId } }),

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

    const invoice = await this.prisma.invoice.findFirst({

      where: { id, organizationId },

      include: { customer: true, items: { include: { product: true } } },

    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    return invoice;

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



  async create(organizationId: string, dto: CreateInvoiceDto) {

    const settings = await this.prisma.organizationSettings.findUnique({

      where: { organizationId },

    });



    const number = dto.number?.trim()
      ? await this.assertUniqueNumber(organizationId, dto.number)
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
              create: dto.items.map((item) => {
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
                };
              }),
            },
          },
          include: { items: { include: { product: true } }, customer: true },
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
      const message = error instanceof Error ? error.message : String(error);
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

    const updateData: Prisma.InvoiceUpdateInput = {
      subtotal,
      taxRate,
      taxAmount,
      total,
    };

    if (dto.status) updateData.status = dto.status as InvoiceStatus;

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
        create: dto.items.map((item) => {
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
          };
        }),
      };
    }



    const updated = await this.prisma.invoice.update({

      where: { id },

      data: updateData,

      include: { items: { include: { product: true } }, customer: true },

    });

    if (dto.status && dto.status !== existing.status) {
      await this.inventoryService.syncInvoiceSaleStock(
        organizationId,
        {
          id: updated.id,
          status: updated.status,
          customerId: updated.customerId,
          items: updated.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
        existing.status,
      );
    }

    return updated;

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


