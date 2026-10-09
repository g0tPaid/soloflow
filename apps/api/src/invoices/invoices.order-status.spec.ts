import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

describe('InvoicesService order cancel', () => {
  const existing = {
    id: 'inv_1',
    organizationId: 'org_1',
    customerId: 'cus_1',
    status: 'SENT',
    fulfillmentStatus: 'QC_COMPLETED',
    discount: 0,
    shipping: 0,
    taxRate: 0,
    amountPaid: 0,
    total: 120,
    customFields: { note: 'keep' },
    items: [{ productId: null, quantity: 1 }],
    payments: [],
    customer: { id: 'cus_1' },
    fulfillmentEvents: [],
  };

  const prisma = {
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const inventory = { syncInvoiceSaleStock: jest.fn() };
  const service = new InvoicesService(prisma as never, inventory as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
    prisma.invoice.findFirst.mockResolvedValue(existing);
    prisma.invoice.update.mockImplementation(async ({ data }: { data: { status: string; customFields?: unknown } }) => ({
      ...existing,
      status: data.status,
      customFields: data.customFields,
    }));
    prisma.auditLog.create.mockResolvedValue({ id: 'audit_1' });
    prisma.auditLog.findFirst.mockResolvedValue(null);
  });

  it('cancels an order, keeps fulfillment, and records the previous status', async () => {
    const updated = await service.cancelOrder('org_1', 'inv_1');

    expect(updated.status).toBe('CANCELLED');
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv_1' },
        data: {
          status: 'CANCELLED',
          customFields: { note: 'keep', statusBeforeCancel: 'SENT' },
        },
      }),
    );
    const data = prisma.invoice.update.mock.calls[0][0].data as { fulfillmentStatus?: unknown };
    expect(data.fulfillmentStatus).toBeUndefined();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org_1',
        action: 'invoice.order_cancelled',
        entityType: 'invoice',
        entityId: 'inv_1',
        metadata: { previousStatus: 'SENT' },
      },
    });
    expect(inventory.syncInvoiceSaleStock).toHaveBeenCalled();
  });

  it('does not write another audit row when the order is already cancelled', async () => {
    prisma.invoice.findFirst.mockResolvedValue({ ...existing, status: 'CANCELLED' });
    const updated = await service.cancelOrder('org_1', 'inv_1');
    expect(updated.status).toBe('CANCELLED');
    expect(prisma.invoice.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects cancelling a void invoice', async () => {
    prisma.invoice.findFirst.mockResolvedValue({ ...existing, status: 'VOID' });
    await expect(service.cancelOrder('org_1', 'inv_1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reopens a cancelled order to the saved status and records it', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...existing,
      status: 'CANCELLED',
      customFields: { note: 'keep', statusBeforeCancel: 'DRAFT' },
    });

    const updated = await service.reopenOrder('org_1', 'inv_1');

    expect(updated.status).toBe('DRAFT');
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DRAFT',
          customFields: { note: 'keep' },
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'invoice.order_reopened',
        entityId: 'inv_1',
        metadata: { restoredStatus: 'DRAFT', previousStatus: 'DRAFT' },
      }),
    });
  });

  it('reopens a cancelled paid order as paid from the payment ledger', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...existing,
      status: 'CANCELLED',
      amountPaid: 120,
      total: 120,
      customFields: { statusBeforeCancel: 'PAID' },
    });

    const updated = await service.reopenOrder('org_1', 'inv_1');
    expect(updated.status).toBe('PAID');
  });

  it('uses the audit log when the saved status is missing', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...existing,
      status: 'CANCELLED',
      customFields: {},
    });
    prisma.auditLog.findFirst.mockResolvedValue({ metadata: { previousStatus: 'OVERDUE' } });

    const updated = await service.reopenOrder('org_1', 'inv_1');
    expect(updated.status).toBe('OVERDUE');
  });

  it('rejects reopening an order that is not cancelled', async () => {
    await expect(service.reopenOrder('org_1', 'inv_1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });
});
