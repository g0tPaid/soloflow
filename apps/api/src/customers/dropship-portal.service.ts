import { BadRequestException, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@flowbooks/database';
import { hashPortalToken, newPortalLink, tokenForNonce } from './dropship-portal-token';
import { DROPSHIPPING_PARTNER_INVOICE_FIELD, FULFILLMENT_STATUS_VALUES, INTERNATIONAL_TRACKING_STATUS, customerTierFromFields } from '@flowbooks/shared';
import { mergeImportedShipments, parsePartnerShipments, type ImportedShipment } from './dropship-shipment-import';
import { PrismaService } from '../prisma/prisma.service';

function partnerInvoices(organizationId: string, customerId: string, includeInactive = false): Prisma.InvoiceWhereInput {
  return {
    organizationId, customerId, vendorId: null,
    AND: [{ OR: [
      { customFields: { path: [DROPSHIPPING_PARTNER_INVOICE_FIELD], equals: true } },
      // Older partner orders may predate the explicit invoice flag.
      { partnerOrderNumber: { not: null } },
    ] }],
    ...(includeInactive ? {} : { status: { notIn: ['CANCELLED', 'VOID'] } }),
  };
}

const shippedStages = FULFILLMENT_STATUS_VALUES.slice(FULFILLMENT_STATUS_VALUES.indexOf(INTERNATIONAL_TRACKING_STATUS));
const shippedFilter: Prisma.InvoiceWhereInput = {
  OR: [
    { fulfillmentStatus: { not: null, in: shippedStages } },
    { fulfillmentStatus: { equals: 'SHIPPED_TO_CHINA_CENTER', not: null }, shippingMethod: { equals: 'LOCAL', not: null }, localTrackingNumber: { not: null } },
  ],
};
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
      // Lock the active customer row until link creation finishes, so deactivation
      // or a customer-type change is serialized with link creation.
      const customer = await tx.customer.updateMany({
        where: { id: customerId, organizationId, isActive: true },
        data: { updatedAt: new Date() },
      });
      if (!customer.count) throw new NotFoundException('Active customer not found');
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
      where: { customerId, customer: { organizationId, isActive: true } },
      select: { linkNonce: true, tokenHash: true },
    });
    const token = portal?.linkNonce ? tokenForNonce(portal.linkNonce) : null;
    return { token: token && hashPortalToken(token) === portal?.tokenHash ? token : null };
  }

  async stock(organizationId: string, userId: string, customerId: string) {
    await this.requireManager(organizationId, userId);
    return this.stockRows(organizationId, customerId);
  }

  async setStock(organizationId: string, userId: string, customerId: string, productId: unknown, allocated: unknown, imageUrl?: unknown) {
    await this.requireManager(organizationId, userId);
    if (typeof productId !== 'string' || typeof allocated !== 'number' || !Number.isFinite(allocated) ||
      allocated < 0 || allocated > 99_999_999 || !/^\d+(?:\.\d{1,4})?$/.test(String(allocated))) {
      throw new BadRequestException('Choose a product and enter a valid stock quantity.');
    }
    if (imageUrl !== undefined && imageUrl !== null && (typeof imageUrl !== 'string' || imageUrl.length > 550_000 ||
      !/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(imageUrl))) {
      throw new BadRequestException('Upload a PNG, JPEG, WebP, or GIF photo under 400 KB.');
    }
    const photo = imageUrl as string | null | undefined;
    const [customer, product] = await Promise.all([
      this.prisma.customer.findFirst({ where: { id: customerId, organizationId, isActive: true, isDropshipper: true }, select: { id: true } }),
      this.prisma.product.findFirst({ where: { id: productId, organizationId }, select: { id: true } }),
    ]);
    if (!customer || !product) throw new NotFoundException('Dropshipper or product not found.');
    await this.prisma.dropshipStock.upsert({
      where: { customerId_productId: { customerId, productId } },
      create: { customerId, productId, allocated, imageUrl: photo },
      update: { allocated, imageUrl: photo },
    });
    return this.stockRows(organizationId, customerId);
  }

  private async stockRows(organizationId: string, customerId: string, tokenHash?: string) {
    const customer = { organizationId, isActive: true, isDropshipper: true,
      ...(tokenHash ? { dropshipPortal: { tokenHash } } : {}) };
    const [stock, shipped] = await Promise.all([
      this.prisma.dropshipStock.findMany({
        where: { customerId, customer, product: { organizationId } },
        select: { allocated: true, imageUrl: true, product: { select: { id: true, name: true, sku: true, imageUrl: true } } },
        orderBy: { product: { name: 'asc' } },
      }),
      this.prisma.invoiceItem.groupBy({
        by: ['productId'], where: { productId: { not: null }, invoice: { ...partnerInvoices(organizationId, customerId), ...shippedFilter, customer } },
        _sum: { quantity: true },
      }),
    ]);
    const quantities = new Map(shipped.map((row) => [row.productId, row._sum.quantity]));
    return stock.map(({ product, allocated, imageUrl }) => {
      const quantity = quantities.get(product.id) ?? 0;
      return { ...product, imageUrl: imageUrl ?? product.imageUrl, allocated: allocated.toString(), shipped: String(quantity), remaining: allocated.minus(quantity).toString() };
    });
  }

  async importShipments(organizationId: string, userId: string, customerId: string, csv: unknown) {
    await this.requireManager(organizationId, userId);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.customer.updateMany({
        where: { id: customerId, organizationId, isActive: true, isDropshipper: true },
        data: { updatedAt: new Date() },
      });
      if (!locked.count) throw new NotFoundException('Active dropshipper not found.');
      const customer = await tx.customer.findUniqueOrThrow({
        where: { id: customerId }, select: { dropshipperNumber: true, dropshipperPrefix: true },
      });
      if (!customer.dropshipperNumber) throw new BadRequestException('Save this customer’s dropshipper number first.');
      const batch = parsePartnerShipments(csv, customer.dropshipperNumber, customer.dropshipperPrefix);
      const existing = await tx.dropshipImportedShipment.findUnique({ where: { customerId } });
      const current = (existing?.rows ?? []) as ImportedShipment[];
      const merged = mergeImportedShipments(current, batch);
      if (merged.length > 2000) throw new BadRequestException('This partner has reached 2,000 imported shipments.');
      await tx.dropshipImportedShipment.upsert({
        where: { customerId }, create: { customerId, rows: merged }, update: { rows: merged },
      });
      return { rows: batch.length, added: merged.length - current.length, total: merged.length };
    });
  }

  async revoke(organizationId: string, userId: string, customerId: string) {
    await this.requireManager(organizationId, userId);
    await this.prisma.dropshipPortal.deleteMany({ where: { customerId, customer: { organizationId } } });
    return { revoked: true };
  }

  async shipments(token: unknown, offset: number, scope: 'all' | 'shipped' = 'shipped', complete = false) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new NotFoundException();
    }
    const tokenHash = hashPortalToken(token);
    const portal = await this.prisma.dropshipPortal.findFirst({
      where: { tokenHash, customer: { isActive: true } },
      select: { customer: { select: { id: true, name: true, address: true, customFields: true, organizationId: true, isDropshipper: true, dropshipperNumber: true, dropshipperPrefix: true } } },
    });
    if (!portal) throw new NotFoundException();
    const { customer } = portal;
    const anchorId = process.env.STAFF_SHIPMENT_SYNC_CUSTOMER_ID;
    const sourcingEnabled = customer.isDropshipper && anchorId ? Boolean(await this.prisma.customer.findFirst({
      where: { id: anchorId, organizationId: customer.organizationId }, select: { id: true },
    })) : false;
    const pageSize = 20;
    // Stock and externally imported staff history are a separate dropshipper-only dataset.
    const stock = customer.isDropshipper ? await this.stockRows(customer.organizationId, customer.id, tokenHash) : [];
    const stockByProduct = new Map(stock.map((row) => [row.id, row]));
    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...(customer.isDropshipper
          ? partnerInvoices(customer.organizationId, customer.id, complete && scope === 'all')
          : { organizationId: customer.organizationId, customerId: customer.id, vendorId: null,
              ...(complete && scope === 'all' ? {} : { status: { notIn: ['CANCELLED', 'VOID'] as ('CANCELLED' | 'VOID')[] } }) }),
        ...(scope === 'shipped' ? shippedFilter : {}),
        customer: { isActive: true, isDropshipper: customer.isDropshipper, dropshipPortal: { tokenHash } },
      },
      orderBy: [{ issueDate: 'desc' }, { id: 'desc' }],
      ...(complete ? {} : { skip: offset, take: pageSize + 1 }),
      select: {
        number: true, issueDate: true, status: true, partnerOrderNumber: true, endRecipientName: true,
        endRecipientAddress: true, shipmentContact: true, shipmentCarrier: true, currency: true, subtotal: true,
        shipping: true, shipmentWeightKg: true, taxAmount: true, discount: true, total: true, shippingToCountry: true,
        shippingMethod: true, fulfillmentStatus: true, internationalTrackingNumber: true, localTrackingNumber: true,
        fulfillmentEvents: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: { createdAt: true, status: true, action: true },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true, productId: true, name: true, description: true, imageUrl: true,
            quantity: true, unitPrice: true, amount: true,
            product: { select: { organizationId: true, imageUrl: true } },
          },
        },
      },
    });
    return {
      partner: customer.name,
      customerTier: customerTierFromFields(customer.customFields),
      customerCountry: customer.address && typeof customer.address === 'object' && !Array.isArray(customer.address) && typeof customer.address.country === 'string' ? customer.address.country.trim() || null : null,
      sourceCustomer: customer.isDropshipper ? { id: customer.id, number: customer.dropshipperNumber, prefix: customer.dropshipperPrefix, sourcingEnabled } : undefined,
      importedShipments: customer.isDropshipper ? (await this.prisma.dropshipImportedShipment.findFirst({
        where: { customerId: customer.id, customer: { organizationId: customer.organizationId, isActive: true, isDropshipper: true, dropshipPortal: { tokenHash } } },
        select: { rows: true },
      }))?.rows ?? [] : [],
      stock,
      hasMore: !complete && invoices.length > pageSize,
      shipments: (complete ? invoices : invoices.slice(0, pageSize)).map(({ fulfillmentEvents, shipmentContact, items, ...invoice }) => ({
        ...invoice,
        endRecipientName: invoice.endRecipientName || (!customer.isDropshipper ? customer.name : null),
        awaiting: !shippedStages.some((stage) => stage === invoice.fulfillmentStatus) &&
          !(invoice.fulfillmentStatus === 'SHIPPED_TO_CHINA_CENTER' &&
            invoice.shippingMethod === 'LOCAL' && invoice.localTrackingNumber !== null),
        items: items.map(({ productId, product, ...item }) => ({
          ...item,
          imageUrl: item.imageUrl || (productId ? stockByProduct.get(productId)?.imageUrl : null) ||
            (product?.organizationId === customer.organizationId ? product.imageUrl : null),
        })),
        shipmentContact: shipmentContact && typeof shipmentContact === 'object' && !Array.isArray(shipmentContact)
          ? Object.fromEntries(['addressLine2', 'city', 'region', 'postcode', 'country'].map((key) => [key, shipmentContact[key]]))
          : null,
        shipmentUpdatedAt: fulfillmentEvents[0]?.createdAt ?? null,
        shippedAt: fulfillmentEvents.find(({ status, action }) => action === 'ON' && status === (invoice.shippingMethod === 'LOCAL'
          ? 'SHIPPED_TO_CHINA_CENTER' : 'SHIPPED_INTERNATIONAL'))?.createdAt ?? null,
      })),
    };
  }
}
