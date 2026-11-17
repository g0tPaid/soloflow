import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { FulfillmentStatus, Prisma } from '@flowbooks/database';
import { DROPSHIPPING_PARTNER_INVOICE_FIELD, fulfillmentRank } from '@flowbooks/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffShipmentSync implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StaffShipmentSync.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!process.env.PARTNER_SHIPMENT_PHOTO_KEY || !process.env.STAFF_SHIPMENT_SYNC_CUSTOMER_ID) return;
    this.timer = setInterval(() => void this.run(), 20_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    try {
      const anchor = await this.prisma.customer.findUnique({
        where: { id: process.env.STAFF_SHIPMENT_SYNC_CUSTOMER_ID },
        select: { organizationId: true },
      });
      if (!anchor) return;
      const invoices = await this.prisma.invoice.findMany({
        where: {
          organizationId: anchor.organizationId,
          customer: { isActive: true, isDropshipper: true, dropshipperNumber: { not: null } },
          status: { notIn: ['CANCELLED', 'VOID'] },
          customFields: { path: [DROPSHIPPING_PARTNER_INVOICE_FIELD], equals: true },
          shipmentContact: { not: Prisma.DbNull },
          OR: [
            { staffSyncedAt: null },
            { staffSyncedAt: { lt: this.prisma.invoice.fields.updatedAt } },
            { staffSyncedAt: { lt: new Date(Date.now() - 300_000) }, internationalTrackingNumber: null, localTrackingNumber: null },
          ],
        },
        include: { customer: { select: { dropshipperNumber: true, dropshipperPrefix: true } } },
        orderBy: [{ staffSyncedAt: { sort: 'asc', nulls: 'first' } }, { updatedAt: 'asc' }],
        take: 12,
      });
      await Promise.allSettled(invoices.map(async (invoice) => {
        const number = invoice.customer?.dropshipperNumber;
        if (!number || !invoice.shipmentContact || typeof invoice.shipmentContact !== 'object' || Array.isArray(invoice.shipmentContact)) return;
        const reference = [invoice.customer?.dropshipperPrefix, number].filter(Boolean).join('-');
        const response = await fetch('https://sourcing.center/api/soloflow-staff-orders', {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(7000),
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.PARTNER_SHIPMENT_PHOTO_KEY },
          body: JSON.stringify({
            id: invoice.id,
            revision: invoice.updatedAt.toISOString(),
            reference,
            order: invoice.partnerOrderNumber || invoice.number,
            customerName: invoice.endRecipientName,
            tracking: invoice.internationalTrackingNumber || invoice.localTrackingNumber,
            carrier: invoice.shipmentCarrier,
            contact: {
              ...invoice.shipmentContact,
              address: invoice.endRecipientAddress,
              country: invoice.shipmentContact.country || invoice.shippingToCountry,
            },
          }),
        });
        if (!response.ok) return;
        const data: { tracking?: unknown; carrier?: unknown } = await response.json();
        const tracking = typeof data.tracking === 'string' && /^[A-Z0-9]{4,40}$/.test(data.tracking) ? data.tracking : null;
        const carrier = typeof data.carrier === 'string' && /^[a-z0-9-]{1,80}$/.test(data.carrier) ? data.carrier : null;
        await this.prisma.$transaction(async (tx) => {
          // A newer invoice edit must not be acknowledged by an older sync attempt.
          const matched = await tx.$executeRaw`UPDATE "invoices" SET "staffSyncedAt" = CURRENT_TIMESTAMP
            WHERE id = ${invoice.id} AND "updatedAt" = ${invoice.updatedAt}`;
          if (!matched || !tracking || invoice.internationalTrackingNumber || invoice.localTrackingNumber) return;
          const domestic = invoice.shippingMethod === 'LOCAL';
          const stage = domestic ? FulfillmentStatus.SHIPPED_TO_CHINA_CENTER : FulfillmentStatus.SHIPPED_INTERNATIONAL;
          const advance = fulfillmentRank(invoice.fulfillmentStatus) < fulfillmentRank(stage);
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              ...(domestic ? { localTrackingNumber: tracking } : { internationalTrackingNumber: tracking }),
              ...(carrier && !invoice.shipmentCarrier ? { shipmentCarrier: carrier } : {}),
              ...(advance ? {
                fulfillmentStatus: stage,
                fulfillmentEvents: { create: { organizationId: invoice.organizationId, status: stage, action: 'ON' } },
              } : {}),
            },
          });
        });
      }));
    } catch {
      this.logger.warn('Staff shipment synchronization will retry.');
    } finally {
      this.running = false;
    }
  }
}
