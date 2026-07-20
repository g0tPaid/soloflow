import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma, StockMovementType } from '@flowbooks/database';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto, UpdateInventoryItemDto } from './dto/inventory.dto';
import { normalizePagination } from '../common/pagination';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async summary(organizationId: string) {
    const products = await this.prisma.product.findMany({
      where: { organizationId, isActive: true, trackInventory: true },
      select: {
        quantityOnHand: true,
        reorderLevel: true,
        unitCost: true,
        unitPrice: true,
      },
    });

    let skuCount = products.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let onHandUnits = 0;
    let inventoryValue = 0;

    for (const p of products) {
      const qty = Number(p.quantityOnHand);
      const reorder = Number(p.reorderLevel);
      const cost = Number(p.unitCost);
      onHandUnits += qty;
      inventoryValue += qty * cost;
      if (qty <= 0) outOfStockCount += 1;
      else if (qty <= reorder) lowStockCount += 1;
    }

    return {
      skuCount,
      lowStockCount,
      outOfStockCount,
      onHandUnits: Math.round(onHandUnits * 10000) / 10000,
      inventoryValue: Math.round(inventoryValue * 100) / 100,
    };
  }

  async findAll(
    organizationId: string,
    opts?: { page?: number; limit?: number; lowStockOnly?: boolean; q?: string },
  ) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(
      opts?.page,
      opts?.limit,
    );

    const where: Prisma.ProductWhereInput = {
      organizationId,
      isActive: true,
    };

    if (opts?.q?.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    let filtered = products;
    if (opts?.lowStockOnly) {
      filtered = products.filter((p) => {
        if (!p.trackInventory) return false;
        const qty = Number(p.quantityOnHand);
        const reorder = Number(p.reorderLevel);
        return qty <= reorder;
      });
    }

    const total = filtered.length;
    const data = filtered.slice(skip, skip + limitNum).map((p) => this.serializeProduct(p));

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

  async findOne(organizationId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, isActive: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const movements = await this.prisma.stockMovement.findMany({
      where: { organizationId, productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      ...this.serializeProduct(product),
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        quantityChange: Number(m.quantityChange),
        quantityAfter: Number(m.quantityAfter),
        note: m.note,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        createdAt: m.createdAt,
      })),
    };
  }

  async updateItem(organizationId: string, productId: string, dto: UpdateInventoryItemDto) {
    await this.requireProduct(organizationId, productId);
    const data: Prisma.ProductUpdateInput = {};
    if (dto.trackInventory !== undefined) data.trackInventory = dto.trackInventory;
    if (dto.reorderLevel !== undefined) data.reorderLevel = dto.reorderLevel;
    if (dto.unitCost !== undefined) data.unitCost = dto.unitCost;
    const product = await this.prisma.product.update({ where: { id: productId }, data });
    return this.serializeProduct(product);
  }

  async adjust(organizationId: string, productId: string, dto: AdjustStockDto) {
    if (!dto.quantityChange || dto.quantityChange === 0) {
      throw new BadRequestException('quantityChange must be non-zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, organizationId, isActive: true },
      });
      if (!product) throw new NotFoundException('Product not found');
      if (!product.trackInventory) {
        throw new BadRequestException('Inventory tracking is off for this product');
      }

      const nextQty = Number(product.quantityOnHand) + dto.quantityChange;
      const type =
        dto.type ??
        (dto.quantityChange > 0 ? StockMovementType.RECEIVE : StockMovementType.ADJUSTMENT);

      const updated = await tx.product.update({
        where: { id: productId },
        data: { quantityOnHand: nextQty },
      });

      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          productId,
          type,
          quantityChange: dto.quantityChange,
          quantityAfter: nextQty,
          note: dto.note?.trim() || null,
        },
      });

      return {
        product: this.serializeProduct(updated),
        movement: {
          id: movement.id,
          type: movement.type,
          quantityChange: Number(movement.quantityChange),
          quantityAfter: Number(movement.quantityAfter),
          note: movement.note,
          createdAt: movement.createdAt,
        },
      };
    });
  }

  /**
   * Apply / reverse stock for customer invoices when status becomes or leaves PAID.
   */
  async syncInvoiceSaleStock(
    organizationId: string,
    invoice: {
      id: string;
      status: InvoiceStatus;
      customerId?: string | null;
      items: { productId: string | null; quantity: Prisma.Decimal | number }[];
    },
    previousStatus: InvoiceStatus,
  ) {
    if (!invoice.customerId) return;

    const becamePaid =
      invoice.status === InvoiceStatus.PAID && previousStatus !== InvoiceStatus.PAID;
    const leftPaid =
      previousStatus === InvoiceStatus.PAID && invoice.status !== InvoiceStatus.PAID;

    if (!becamePaid && !leftPaid) return;

    const direction = becamePaid ? -1 : 1;
    const type = becamePaid ? StockMovementType.SALE : StockMovementType.RETURN;
    const note = becamePaid
      ? `Sold on invoice ${invoice.id}`
      : `Stock restored (invoice no longer Paid)`;

    await this.prisma.$transaction(async (tx) => {
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

        const change = direction * Number(item.quantity);
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
            type,
            quantityChange: change,
            quantityAfter: nextQty,
            note,
            referenceType: 'invoice',
            referenceId: invoice.id,
          },
        });
      }
    });
  }

  private async requireProduct(organizationId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, isActive: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private serializeProduct(p: {
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    imageUrl: string | null;
    unitPrice: Prisma.Decimal | number;
    currency: string;
    taxRate: Prisma.Decimal | number;
    trackInventory: boolean;
    quantityOnHand: Prisma.Decimal | number;
    reorderLevel: Prisma.Decimal | number;
    unitCost: Prisma.Decimal | number;
    isActive: boolean;
  }) {
    const quantityOnHand = Number(p.quantityOnHand);
    const reorderLevel = Number(p.reorderLevel);
    const unitCost = Number(p.unitCost);
    const unitPrice = Number(p.unitPrice);
    const lowStock = p.trackInventory && quantityOnHand <= reorderLevel;
    const outOfStock = p.trackInventory && quantityOnHand <= 0;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      sku: p.sku,
      imageUrl: p.imageUrl,
      unitPrice,
      currency: p.currency,
      taxRate: Number(p.taxRate),
      trackInventory: p.trackInventory,
      quantityOnHand,
      reorderLevel,
      unitCost,
      inventoryValue: Math.round(quantityOnHand * unitCost * 100) / 100,
      lowStock,
      outOfStock,
      isActive: p.isActive,
    };
  }
}
