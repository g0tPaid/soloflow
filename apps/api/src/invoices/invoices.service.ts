import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { InvoiceStatus, Prisma } from '@flowbooks/database';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true } }, items: true },
      }),
      this.prisma.invoice.count({ where: { organizationId } }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: { customer: true, items: { include: { product: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(organizationId: string, dto: CreateInvoiceDto) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    const number = `${settings?.invoicePrefix || 'INV'}-${String(settings?.invoiceNextNum || 1).padStart(5, '0')}`;

    const { subtotal, taxAmount, total } = this.calculateTotals(dto.items, dto.discount || 0);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          customerId: dto.customerId,
          number,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          currency: dto.currency || settings?.currency || 'USD',
          notes: dto.notes,
          discount: dto.discount || 0,
          subtotal,
          taxAmount,
          total,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate || 0,
              amount: item.quantity * item.unitPrice,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      await tx.organizationSettings.update({
        where: { organizationId },
        data: { invoiceNextNum: (settings?.invoiceNextNum || 1) + 1 },
      });

      return invoice;
    });
  }

  async update(organizationId: string, id: string, dto: UpdateInvoiceDto) {
    await this.findOne(organizationId, id);

    const updateData: Prisma.InvoiceUpdateInput = {};
    if (dto.status) updateData.status = dto.status as InvoiceStatus;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.discount !== undefined) updateData.discount = dto.discount;

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { items: true, customer: true },
    });
  }

  private calculateTotals(
    items: { quantity: number; unitPrice: number; taxRate?: number }[],
    discount: number,
  ) {
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of items) {
      const amount = item.quantity * item.unitPrice;
      subtotal += amount;
      taxAmount += amount * (item.taxRate || 0);
    }

    const total = subtotal + taxAmount - discount;
    return { subtotal, taxAmount, total };
  }
}
