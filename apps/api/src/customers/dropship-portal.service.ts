import { BadRequestException, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@flowbooks/database';
import { hashPortalToken, newPortalLink, tokenForNonce } from './dropship-portal-token';
import { DROPSHIPPING_PARTNER_INVOICE_FIELD, FULFILLMENT_STATUS_VALUES, INTERNATIONAL_TRACKING_STATUS } from '@flowbooks/shared';
import { PrismaService } from '../prisma/prisma.service';

function shippedInvoices(organizationId: string, customerId: string): Prisma.InvoiceWhereInput {
  const stages = FULFILLMENT_STATUS_VALUES.slice(FULFILLMENT_STATUS_VALUES.indexOf(INTERNATIONAL_TRACKING_STATUS));
  return {
    organizationId, customerId, vendorId: null,
    customFields: { path: [DROPSHIPPING_PARTNER_INVOICE_FIELD], equals: true },
    status: { notIn: ['CANCELLED', 'VOID'] },
    OR: [
      { fulfillmentStatus: { in: stages } },
      { fulfillmentStatus: 'SHIPPED_TO_CHINA_CENTER', shippingMethod: 'LOCAL', localTrackingNumber: { not: null } },
    ],
  };
}
@Injectable()
export class DropshipPortalService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireManager(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { role: true },
    });
    if (member?.role !== 'OWNER' && member?.role !== 'ADMIN') {
      throw new ForbiddenException('Only organization admins can manage private links');
    }
  }

  async issue(organizationId: string, userId: string, customerId: string) {
    await this.requireManager(organizationId, userId);
    const { token, tokenHash, linkNonce } = newPortalLink();
    await this.prisma.$transaction(async (tx) => {
      // Lock the customer row until link creation finishes, so disabling the flag wins
      // whether it runs immediately before or after link creation.
      const customer = await tx.customer.updateMany({
        where: { id: customerId, organizationId, isActive: true, isDropshipper: true },
        data: { updatedAt: new Date() },
      });
      if (!customer.count) throw new NotFoundException('Active dropshipper not found');
      await tx.dropshipPortal.upsert({
        where: { customerId },
        create: { customerId, tokenHash, linkNonce },
        update: { tokenHash, linkNonce, createdAt: new Date() },
      });
    });
    return { token };
  }

  async current(organizationId: string, userId: string, customerId: string) {
    await this.requireManager(organizationId, userId);
    const portal = await this.prisma.dropshipPortal.findFirst({
      where: { customerId, customer: { organizationId, isActive: true, isDropshipper: true } },
      select: { linkNonce: true, tokenHash: true },
    });
    const token = portal?.linkNonce ? tokenForNonce(portal.linkNonce) : null;
    return { token: token && hashPortalToken(token) === portal?.tokenHash ? token : null };
  }

  async stock(organizationId: string, userId: string, customerId: string) {
    await this.requireManager(organizationId, userId);
    return this.stockRows(organizationId, customerId);
  }

  async setStock(organizationId: string, userId: string, customerId: string, productId: unknown, allocated: unknown) {
    await this.requireManager(organizationId, userId);
    if (typeof productId !== 'string' || typeof allocated !== 'number' || !Number.isFinite(allocated) ||
      allocated < 0 || allocated > 99_999_999 || !/^\d+(?:\.\d{1,4})?$/.test(String(allocated))) {
      throw new BadRequestException('Choose a product and enter a valid stock quantity.');
    }
    const [customer, product] = await Promise.all([
      this.prisma.customer.findFirst({ where: { id: customerId, organizationId, isActive: true, isDropshipper: true }, select: { id: true } }),
      this.prisma.product.findFirst({ where: { id: productId, organizationId }, select: { id: true } }),
    ]);
    if (!customer || !product) throw new NotFoundException('Dropshipper or product not found.');
    await this.prisma.dropshipStock.upsert({
      where: { customerId_productId: { customerId, productId } },
      create: { customerId, productId, allocated },
      update: { allocated },
    });
    return this.stockRows(organizationId, customerId);
  }

  private async stockRows(organizationId: string, customerId: string, tokenHash?: string) {
    const customer = { organizationId, isActive: true, isDropshipper: true,
      ...(tokenHash ? { dropshipPortal: { tokenHash } } : {}) };
    const [stock, shipped] = await Promise.all([
      this.prisma.dropshipStock.findMany({
        where: { customerId, customer, product: { organizationId } },
        select: { allocated: true, product: { select: { id: true, name: true, sku: true, imageUrl: true } } },
        orderBy: { product: { name: 'asc' } },
      }),
      this.prisma.invoiceItem.groupBy({
        by: ['productId'], where: { productId: { not: null }, invoice: { ...shippedInvoices(organizationId, customerId), customer } },
        _sum: { quantity: true },
      }),
    ]);
    const quantities = new Map(shipped.map((row) => [row.productId, row._sum.quantity]));
    return stock.map(({ product, allocated }) => {
      const quantity = quantities.get(product.id) ?? 0;
      return { ...product, allocated: allocated.toString(), shipped: String(quantity), remaining: allocated.minus(quantity).toString() };
    });
  }

  async revoke(organizationId: string, userId: string, customerId: string) {
    await this.requireManager(organizationId, userId);
    await this.prisma.dropshipPortal.deleteMany({ where: { customerId, customer: { organizationId } } });
    return { revoked: true };
  }

  async shipments(token: unknown, offset: number) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new NotFoundException();
    }
    const tokenHash = hashPortalToken(token);
    const portal = await this.prisma.dropshipPortal.findFirst({
      where: { tokenHash, customer: { isActive: true, isDropshipper: true } },
      select: { customer: { select: { id: true, name: true, organizationId: true } } },
    });
    if (!portal) throw new NotFoundException();
    const { customer } = portal;
    const pageSize = 20;
    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...shippedInvoices(customer.organizationId, customer.id),
        customer: { isActive: true, isDropshipper: true, dropshipPortal: { tokenHash } },
      },
      orderBy: [{ issueDate: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: pageSize + 1,
      select: {
        number: true, issueDate: true, partnerOrderNumber: true, endRecipientName: true,
        endRecipientAddress: true, shipmentCarrier: true, currency: true, subtotal: true,
        shipping: true, shipmentWeightKg: true, taxAmount: true, discount: true, total: true, shippingToCountry: true,
        shippingMethod: true, fulfillmentStatus: true, internationalTrackingNumber: true, localTrackingNumber: true,
        fulfillmentEvents: {
          where: { action: 'ON', status: { in: ['SHIPPED_INTERNATIONAL', 'SHIPPED_TO_CHINA_CENTER'] } },
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: { createdAt: true, status: true },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, description: true, imageUrl: true, quantity: true, unitPrice: true, amount: true },
        },
      },
    });
    return {
      partner: customer.name,
      stock: await this.stockRows(customer.organizationId, customer.id, tokenHash),
      hasMore: invoices.length > pageSize,
      shipments: invoices.slice(0, pageSize).map(({ fulfillmentEvents, ...invoice }) => ({
        ...invoice,
        shippedAt: fulfillmentEvents.find(({ status }) => status === (invoice.shippingMethod === 'LOCAL'
          ? 'SHIPPED_TO_CHINA_CENTER' : 'SHIPPED_INTERNATIONAL'))?.createdAt ?? null,
      })),
    };
  }
}
