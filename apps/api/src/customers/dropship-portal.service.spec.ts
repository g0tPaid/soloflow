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
    customer: { updateMany: jest.fn() },
    dropshipPortal: { upsert: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn() },
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
    expect(prisma.dropshipPortal.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: 'partner' },
      create: expect.objectContaining({ customerId: 'partner', tokenHash: digest }),
      update: expect.objectContaining({ tokenHash: digest }),
    }));
    expect(prisma.customer.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org', id: 'partner', isActive: true, isDropshipper: true },
    }));
  });

  it('never loads shipment records for invalid, unknown, or revoked links', async () => {
    prisma.dropshipPortal.findFirst.mockResolvedValue(null);
    await expect(service.shipments('bad-token', 0)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.shipments(token, 0)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
  });

  it('selects only flagged and shipped customer invoices with partner-facing amounts', async () => {
    prisma.dropshipPortal.findFirst.mockResolvedValue({
      customer: { id: 'partner', organizationId: 'org', name: 'Partner', dropshipperNumber: '0042', dropshipperPrefix: 'A' },
    });
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.invoiceItem.groupBy.mockResolvedValue([]);
    prisma.dropshipStock.findMany.mockResolvedValue([]);
    await expect(service.shipments(token, 20)).resolves.toEqual({ partner: 'Partner', sourceCustomer: { id: 'partner', number: '0042', prefix: 'A', sourcingEnabled: false }, hasMore: false, shipments: [], stock: [], importedShipments: [] });
    const query = prisma.invoice.findMany.mock.calls[0][0];
    expect(query.where).toMatchObject({
      organizationId: 'org',
      customerId: 'partner',
      vendorId: null,
      status: { notIn: ['CANCELLED', 'VOID'] },
      customer: { isActive: true, isDropshipper: true, dropshipPortal: { tokenHash } },
      customFields: { path: ['dropshippingPartner'], equals: true },
    });
    await service.shipments(token, 0, true);
    const awaitingQuery = prisma.invoice.findMany.mock.calls[1][0];
    expect(awaitingQuery.where.NOT).toEqual({ OR: query.where.OR });
    expect(awaitingQuery.where.status).toEqual({ notIn: ['CANCELLED', 'VOID'] });
    expect(awaitingQuery.where.customer).toEqual(query.where.customer);
    expect(query.where.OR[0].fulfillmentStatus.in).toContain('SHIPPED_INTERNATIONAL');
    expect(query.skip).toBe(20);
    expect(query.take).toBe(21);
    expect(query.select).not.toHaveProperty('shippingCost');
    expect(query.select.items.select).not.toHaveProperty('unitCost');
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
