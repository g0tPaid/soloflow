import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { DROPSHIPPING_PARTNER_INVOICE_FIELD, FULFILLMENT_STATUS_VALUES, INTERNATIONAL_TRACKING_STATUS } from '@flowbooks/shared';
import { PrismaService } from '../prisma/prisma.service';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
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
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
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
        create: { customerId, tokenHash },
        update: { tokenHash, createdAt: new Date() },
      });
    });
    return { token };
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
    const tokenHash = hashToken(token);
    const portal = await this.prisma.dropshipPortal.findFirst({
      where: { tokenHash, customer: { isActive: true, isDropshipper: true } },
      select: { customer: { select: { id: true, name: true, organizationId: true } } },
    });
    if (!portal) throw new NotFoundException();
    const { customer } = portal;
    const outwardStages = FULFILLMENT_STATUS_VALUES.slice(FULFILLMENT_STATUS_VALUES.indexOf(INTERNATIONAL_TRACKING_STATUS));
    const pageSize = 20;
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId: customer.organizationId,
        customerId: customer.id,
        vendorId: null,
        customer: { isActive: true, isDropshipper: true, dropshipPortal: { tokenHash } },
        customFields: { path: [DROPSHIPPING_PARTNER_INVOICE_FIELD], equals: true },
        status: { notIn: ['CANCELLED', 'VOID'] },
        OR: [
          { fulfillmentStatus: { in: outwardStages } },
          { fulfillmentStatus: 'SHIPPED_TO_CHINA_CENTER', shippingMethod: 'LOCAL', localTrackingNumber: { not: null } },
        ],
      },
      orderBy: [{ issueDate: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: pageSize + 1,
      select: {
        number: true, issueDate: true, partnerOrderNumber: true, endRecipientName: true,
        endRecipientAddress: true, shipmentCarrier: true, currency: true, subtotal: true,
        shipping: true, taxAmount: true, discount: true, total: true, shippingToCountry: true,
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
      hasMore: invoices.length > pageSize,
      shipments: invoices.slice(0, pageSize).map(({ fulfillmentEvents, ...invoice }) => ({
        ...invoice,
        shippedAt: fulfillmentEvents.find(({ status }) => status === (invoice.shippingMethod === 'LOCAL'
          ? 'SHIPPED_TO_CHINA_CENTER' : 'SHIPPED_INTERNATIONAL'))?.createdAt ?? null,
      })),
    };
  }
}
