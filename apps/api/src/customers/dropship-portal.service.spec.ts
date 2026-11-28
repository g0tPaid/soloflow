import { createHash } from 'node:crypto';
import { Prisma } from '@flowbooks/database';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DropshipPortalService } from './dropship-portal.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('DropshipPortalService', () => {
  const token = 'x'.repeat(43);
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const prisma = {
    organizationMember: { findUnique: jest.fn() },
    customer: { updateMany: jest.fn(), findFirst: jest.fn() },
    dropshipPortal: { upsert: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
    invoice: { findMany: jest.fn() },
    invoiceItem: { groupBy: jest.fn() },
    dropshipStock: { findMany: jest.fn() },
    dropshipImportedShipment: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new DropshipPortalService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
  });

  it('requires admin access and replaces the stored digest instead of persisting the share token', async () => {
    prisma.organizationMember.findUnique.mockResolvedValueOnce({ role: 'MEMBER' });
    await expect(service.issue('org', 'member', 'partner')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.dropshipPortal.upsert).not.toHaveBeenCalled();

    prisma.organizationMember.findUnique.mockResolvedValue({ role: 'OWNER' });
    prisma.customer.updateMany.mockResolvedValue({ count: 1 });
    const issued = await service.issue('org', 'owner', 'partner');
    expect(issued.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const digest = createHash('sha256').update(issued.token).digest('hex');
    expect(issued.shortCode).toBe(Buffer.from(digest.slice(0, 32), 'hex').toString('base64url'));
    expect(prisma.dropshipPortal.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: 'partner' },
      create: expect.objectContaining({ customerId: 'partner', tokenHash: digest }),
      update: expect.objectContaining({ tokenHash: digest }),
    }));
    expect(prisma.customer.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org', id: 'partner', isActive: true },
    }));
  });

  it('never loads shipment records for invalid, unknown, or revoked links', async () => {
    prisma.dropshipPortal.findFirst.mockResolvedValue(null);
    await expect(service.shipments('bad-token', 0)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.shipments(token, 0)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
  });

  it('resolves a 128-bit short code to the same full digest and rejects collisions and revocation', async () => {
    const shortCode = Buffer.from(tokenHash.slice(0, 32), 'hex').toString('base64url');
    prisma.dropshipPortal.findMany.mockResolvedValue([{ tokenHash }]);
    prisma.dropshipPortal.findFirst.mockResolvedValue({ customer: { id: 'regular', organizationId: 'org', name: 'Buyer', isDropshipper: false } });
    prisma.invoice.findMany.mockResolvedValue([]);
    const result = await service.shipments(shortCode, 0, 'all', true);
    expect(result.partner).toBe('Buyer');
    expect(prisma.dropshipPortal.findMany).toHaveBeenCalledWith({ where: { tokenHash: { startsWith: tokenHash.slice(0, 32) }, customer: { isActive: true } }, select: { tokenHash: true }, take: 2 });
    expect(prisma.invoice.findMany.mock.calls[0][0].where.customer.dropshipPortal).toEqual({ tokenHash });
    prisma.dropshipPortal.findMany.mockResolvedValue([]);
    await expect(service.shipments(shortCode, 0)).rejects.toBeInstanceOf(NotFoundException);
    prisma.dropshipPortal.findMany.mockResolvedValue([{ tokenHash }, { tokenHash }]);
    await expect(service.shipments(shortCode, 0)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.invoice.findMany).toHaveBeenCalledTimes(1);
  });

  it('selects only flagged and shipped customer invoices with partner-facing amounts', async () => {
    prisma.dropshipPortal.findFirst.mockResolvedValue({
      customer: { id: 'partner', organizationId: 'org', name: 'Partner', address: { country: 'UAE' }, customFields: { customerTier: 'GOLD', internalNote: 'private' }, isDropshipper: true, dropshipperNumber: '0042', dropshipperPrefix: 'A' },
    });
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.invoiceItem.groupBy.mockResolvedValue([]);
    prisma.dropshipStock.findMany.mockResolvedValue([]);
    await expect(service.shipments(token, 20)).resolves.toEqual({ partner: 'Partner', customerTier: 'GOLD', customerCountry: 'UAE', sourceCustomer: { id: 'partner', number: '0042', prefix: 'A', sourcingEnabled: false }, hasMore: false, shipments: [], stock: [], importedShipments: [] });
    const query = prisma.invoice.findMany.mock.calls[0][0];
    expect(query.where).toMatchObject({
      organizationId: 'org',
      customerId: 'partner',
      vendorId: null,
      status: { notIn: ['CANCELLED', 'VOID'] },
      customer: { isActive: true, isDropshipper: true, dropshipPortal: { tokenHash } },
      AND: [{ OR: [
        { customFields: { path: ['dropshippingPartner'], equals: true } },
        { partnerOrderNumber: { not: null } },
      ] }],
    });
    await service.shipments(token, 0, 'all');
    const allQuery = prisma.invoice.findMany.mock.calls[1][0];
    expect(allQuery.where).not.toHaveProperty('OR');
    expect(allQuery.where.status).toEqual({ notIn: ['CANCELLED', 'VOID'] });
    expect(allQuery.where.customer).toEqual(query.where.customer);
    expect(query.where.OR[0].fulfillmentStatus.in).toContain('SHIPPED_INTERNATIONAL');
    expect(query.skip).toBe(20);
    expect(query.take).toBe(21);
    expect(query.select).not.toHaveProperty('shippingCost');
    expect(query.select.items.select).not.toHaveProperty('unitCost');
  });
  it('returns all 45 orders in complete mode while preserving the authenticated customer scope', async () => {
    prisma.dropshipPortal.findFirst.mockResolvedValue({
      customer: { id: 'partner', organizationId: 'org', name: 'Partner', isDropshipper: true, dropshipperNumber: '0042', dropshipperPrefix: 'A' },
    });
    prisma.invoiceItem.groupBy.mockResolvedValue([]);
    prisma.dropshipStock.findMany.mockResolvedValue([]);
    prisma.dropshipImportedShipment.findFirst.mockResolvedValue(null);
    prisma.invoice.findMany.mockResolvedValue(Array.from({ length: 45 }, (_, index) => ({
      number: 'INV-' + index, status: index === 44 ? 'CANCELLED' : 'DRAFT',
      fulfillmentStatus: index === 0 ? 'QC_COMPLETED' : null,
      fulfillmentEvents: [], items: [], shipmentContact: null,
    })));
    const result = await service.shipments(token, 0, 'all', true);
    expect(result.shipments).toHaveLength(45);
    expect(result.hasMore).toBe(false);
    expect(result.shipments[0].fulfillmentStatus).toBe('QC_COMPLETED');
    expect(result.shipments[44].status).toBe('CANCELLED');
    const query = prisma.invoice.findMany.mock.calls[0][0];
    expect(query).not.toHaveProperty('take');
    expect(query).not.toHaveProperty('skip');
    expect(query.where).not.toHaveProperty('status');
    expect(query.where).toMatchObject({
      organizationId: 'org', customerId: 'partner', vendorId: null,
      customer: { isActive: true, isDropshipper: true, dropshipPortal: { tokenHash } },
    });
  });

  it('omits image columns for the fast first render and retains the complete customer order list', async () => {
    prisma.dropshipPortal.findFirst.mockResolvedValue({ customer: { id: 'regular', organizationId: 'org', name: 'Buyer', isDropshipper: false } });
    prisma.invoice.findMany.mockResolvedValue([{ number: 'INV-1', status: 'PAID', fulfillmentEvents: [], shipmentContact: null,
      items: [{ id: 'item', name: 'Product', imageUrl: 'data:image/png;base64,AAAA', productId: null, product: null }] }]);
    const result = await service.shipments(token, 0, 'all', true, true);
    expect(result.imagesDeferred).toBe(true);
    expect(result.shipments[0].items[0].imageUrl).toBeNull();
    expect(prisma.invoice.findMany.mock.calls[0][0].select.items.select.imageUrl).toBe(false);
    expect(prisma.invoice.findMany.mock.calls[0][0].select.items.select.product.select.imageUrl).toBe(false);
  });

  it('shows every regular customer sales order but never loads partner-only stock or imported history', async () => {
    prisma.dropshipPortal.findFirst.mockResolvedValue({
      customer: { id: 'regular', organizationId: 'org', name: 'Regular Buyer', isDropshipper: false, dropshipperNumber: '0042' },
    });
    prisma.invoice.findMany.mockResolvedValue([
      { number: 'INV-REG-1', status: 'PAID', fulfillmentStatus: 'SHIPPED_INTERNATIONAL', endRecipientName: null,
        fulfillmentEvents: [], items: [], shipmentContact: null },
      { number: 'INV-REG-2', status: 'DRAFT', fulfillmentStatus: null, endRecipientName: null,
        fulfillmentEvents: [], items: [], shipmentContact: null },
    ]);
    const result = await service.shipments(token, 0, 'all', true);
    expect(result.shipments.map(s => s.number)).toEqual(['INV-REG-1', 'INV-REG-2']);
    expect(result.shipments[0].endRecipientName).toBe('Regular Buyer');
    expect(result.stock).toEqual([]);
    expect(result.importedShipments).toEqual([]);
    expect(result.sourceCustomer).toBeUndefined();
    expect(prisma.customer.findFirst).not.toHaveBeenCalled();
    expect(prisma.dropshipStock.findMany).not.toHaveBeenCalled();
    expect(prisma.dropshipImportedShipment.findFirst).not.toHaveBeenCalled();
    const query = prisma.invoice.findMany.mock.calls[0][0];
    expect(query.where).toMatchObject({
      organizationId: 'org', customerId: 'regular', vendorId: null,
      customer: { isActive: true, isDropshipper: false, dropshipPortal: { tokenHash } },
    });
    expect(query.where).not.toHaveProperty('AND');
    expect(query).not.toHaveProperty('take');
    expect(query.select).not.toHaveProperty('shippingCost');
    expect(query.select.items.select).not.toHaveProperty('unitCost');
  });

  it('cannot issue a link for a customer outside the organization or inactive customer', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
    prisma.customer.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.issue('org', 'admin', 'different-org-customer')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.dropshipPortal.upsert).not.toHaveBeenCalled();
  });

  it('deducts this partner’s shipped units from the allocated stock for the selected product', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
    prisma.dropshipStock.findMany.mockResolvedValue([{
      allocated: new Prisma.Decimal('20'),
      product: { id: 'product-1', name: 'T-shirt', sku: 'TS', imageUrl: null },
    }]);
    prisma.invoiceItem.groupBy.mockResolvedValue([{ productId: 'product-1', _sum: { quantity: new Prisma.Decimal('6') } }]);
    await expect(service.stock('org', 'admin', 'partner')).resolves.toEqual([
      { id: 'product-1', name: 'T-shirt', sku: 'TS', imageUrl: null, allocated: '20', shipped: '6', remaining: '14' },
    ]);
    const query = prisma.invoiceItem.groupBy.mock.calls[0][0];
    expect(query.where.invoice).toMatchObject({ organizationId: 'org', customerId: 'partner' });
  });
});
