import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { FulfillmentStatus, Prisma } from '@flowbooks/database';
import { DROPSHIPPING_PARTNER_INVOICE_FIELD, fulfillmentPressEvents, fulfillmentRank } from '@flowbooks/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffShipmentSync implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StaffShipmentSync.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private lastPartnerSync = 0;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!process.env.PARTNER_SHIPMENT_PHOTO_KEY || !process.env.STAFF_SHIPMENT_SYNC_CUSTOMER_ID) return;
    void this.run();
    this.timer = setInterval(() => void this.run(), 20_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async send(body: Record<string, unknown>) {
    return fetch('https://sourcing.center/api/soloflow-staff-orders', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(7000),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.PARTNER_SHIPMENT_PHOTO_KEY },
      body: JSON.stringify(body),
    });
  }

  private async syncPartnerLabels(organizationId: string) {
    if (Date.now() - this.lastPartnerSync < 15_000) return;
    const customers = await this.prisma.customer.findMany({
      where: { organizationId, isActive: true, isDropshipper: true, dropshipperNumber: { not: null } },
      select: { dropshipperNumber: true, dropshipperPrefix: true, name: true },
    });
    const partners = customers.flatMap((customer) => customer.dropshipperNumber && customer.name.trim() ? [{
      number: customer.dropshipperNumber,
      prefix: customer.dropshipperPrefix ?? '',
      name: customer.name.trim().slice(0, 250),
    }] : []);
    const response = await this.send({ partners });
    if (response.ok) this.lastPartnerSync = Date.now();
    else this.logger.warn(`Dropshipper ID sync returned HTTP ${response.status}; will retry.`);
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
      await this.syncPartnerLabels(anchor.organizationId).catch(() => this.logger.warn('Dropshipper ID sync failed; will retry.'));
      const invoices = await this.prisma.invoice.findMany({
        where: {
          organizationId: anchor.organizationId,
          customer: { isActive: true, isDropshipper: true, dropshipperNumber: { not: null } },
          status: { notIn: ['CANCELLED', 'VOID'] },
          AND: [{
            OR: [
              { customFields: { path: [DROPSHIPPING_PARTNER_INVOICE_FIELD], equals: true } },
              { shipmentContact: { not: Prisma.DbNull } },
              { endRecipientName: { not: null } },
              { endRecipientAddress: { not: null } },
              { partnerOrderNumber: { not: null } },
              { internationalTrackingNumber: { not: null } },
              { localTrackingNumber: { not: null } },
            ],
          }],
          OR: [
            { staffSyncedAt: null },
            { staffSyncedAt: { lt: this.prisma.invoice.fields.updatedAt } },
            { staffSyncedAt: { lt: new Date(Date.now() - 300_000) } },
          ],
        },
        include: { customer: { select: { dropshipperNumber: true, dropshipperPrefix: true } } },
        orderBy: [{ staffSyncedAt: { sort: 'asc', nulls: 'first' } }, { updatedAt: 'asc' }],
        take: 12,
      });
      await Promise.allSettled(invoices.map(async (invoice) => {
        const number = invoice.customer?.dropshipperNumber;
        if (!number) return;
        const contact = invoice.shipmentContact && typeof invoice.shipmentContact === 'object' && !Array.isArray(invoice.shipmentContact)
          ? invoice.shipmentContact : {};
        const reference = [invoice.customer?.dropshipperPrefix, number].filter(Boolean).join('-');
        const response = await this.send({
            id: invoice.id,
            revision: invoice.updatedAt.toISOString(),
            reference,
            order: invoice.partnerOrderNumber || invoice.number,
            customerName: invoice.endRecipientName,
            tracking: invoice.internationalTrackingNumber || invoice.localTrackingNumber,
            carrier: invoice.shipmentCarrier,
            contact: {
              ...contact,
              address: invoice.endRecipientAddress,
              country: contact.country || invoice.shippingToCountry,
            },
        });
        if (!response.ok) return;
        const data: { tracking?: unknown; carrier?: unknown; trackingStatus?: unknown } = await response.json();
        const tracking = typeof data.tracking === 'string' && /^[A-Z0-9]{4,40}$/.test(data.tracking) ? data.tracking : null;
        const carrier = typeof data.carrier === 'string' && /^[a-z0-9-]{1,80}$/.test(data.carrier) ? data.carrier : null;
        await this.prisma.$transaction(async (tx) => {
          // A newer invoice edit must not be acknowledged by an older sync attempt.
          const matched = await tx.$executeRaw`UPDATE "invoices" SET "staffSyncedAt" = CURRENT_TIMESTAMP
            WHERE id = ${invoice.id} AND "updatedAt" = ${invoice.updatedAt}`;
          if (!matched || !tracking) return;
          const existingTracking = invoice.internationalTrackingNumber || invoice.localTrackingNumber;
          // Never apply an update for a different parcel, or overwrite a staff-edited invoice's tracking.
          if (existingTracking && existingTracking.toUpperCase() !== tracking) return;
          const domestic = invoice.shippingMethod === 'LOCAL';
          const shippedStage = domestic ? FulfillmentStatus.SHIPPED_TO_CHINA_CENTER : FulfillmentStatus.SHIPPED_INTERNATIONAL;
          const knownInTransit = ['Picked Up', 'In Transit', 'Arrived at Destination Country', 'Customs Clearance', 'Customs Released', 'Out for Delivery', 'Delivered'].includes(String(data.trackingStatus));
          const stage = !domestic && data.trackingStatus === 'Delivered' ? FulfillmentStatus.CUSTOMER_RECEIVED : shippedStage;
          const advance = (!existingTracking || knownInTransit) && fulfillmentRank(invoice.fulfillmentStatus) < fulfillmentRank(stage);
          if (existingTracking && !advance && (!carrier || invoice.shipmentCarrier)) return;
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              ...(!existingTracking ? (domestic ? { localTrackingNumber: tracking } : { internationalTrackingNumber: tracking }) : {}),
              ...(carrier && !invoice.shipmentCarrier ? { shipmentCarrier: carrier } : {}),
              ...(advance ? {
                fulfillmentStatus: stage,
                fulfillmentEvents: { create: fulfillmentPressEvents(invoice.fulfillmentStatus, stage).map((event) => ({
                  organizationId: invoice.organizationId, ...event,
                })) },
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
