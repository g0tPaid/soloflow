import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

describe('InvoicesService payments', () => {
  const invoice = {
    id: 'inv_1',
    organizationId: 'org_1',
    customerId: 'cus_1',
    status: 'PARTIAL',
    discount: 0,
    shipping: 0,
    taxRate: 0,
    amountPaid: 60,
    total: 100,
    items: [],
    payments: [
      { id: 'pay_1', amount: 40, voidedAt: null, method: 'CASH' },
      { id: 'pay_2', amount: 20, voidedAt: null, method: 'BANK' },
    ],
    fulfillmentEvents: [],
    customFields: {},
  };

  const prisma = {
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const inventory = { syncInvoiceSaleStock: jest.fn() };
  const service = new InvoicesService(prisma as never, inventory as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
    prisma.invoice.findFirst.mockResolvedValue(invoice);
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay_1',
      invoiceId: 'inv_1',
      organizationId: 'org_1',
      amount: 40,
      method: 'CASH',
      voidedAt: null,
    });
    prisma.payment.findMany.mockResolvedValue([{ id: 'pay_2', amount: 20, voidedAt: null }]);
    prisma.payment.update.mockResolvedValue({});
    prisma.invoice.update.mockImplementation(async ({ data }: { data: { status: string; amountPaid: number } }) => ({
      ...invoice,
      status: data.status,
      amountPaid: data.amountPaid,
      payments: [
        { id: 'pay_1', amount: 40, voidedAt: new Date(), method: 'CASH' },
        { id: 'pay_2', amount: 20, voidedAt: null, method: 'BANK' },
      ],
    }));
    prisma.auditLog.create.mockResolvedValue({ id: 'audit_1' });
  });

  it('voids one payment, keeps the other, and recomputes the balance', async () => {
    const updated = await service.voidPayment('org_1', 'inv_1', 'pay_1');

    expect(prisma.payment.deleteMany).not.toHaveBeenCalled();
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay_1' },
        data: expect.objectContaining({ voidedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.payment.findMany).toHaveBeenCalledWith({
      where: { invoiceId: 'inv_1', organizationId: 'org_1', voidedAt: null },
    });
    expect(updated.amountPaid).toBe(20);
    expect(updated.status).toBe('PARTIAL');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'invoice.payment_voided',
          organizationId: 'org_1',
          entityId: 'inv_1',
          metadata: expect.objectContaining({
            paymentId: 'pay_1',
            amount: 40,
            nextAmountPaid: 20,
            previousStatus: 'PARTIAL',
          }),
        }),
      }),
    );
  });

  it('stays paid when the payments that remain still cover the total', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...invoice,
      status: 'PAID',
      amountPaid: 150,
      total: 100,
      items: [{ quantity: 1, unitPrice: 100 }],
    });
    prisma.payment.findMany.mockResolvedValue([{ id: 'pay_2', amount: 120, voidedAt: null }]);
    await service.voidPayment('org_1', 'inv_1', 'pay_1');
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountPaid: 120, status: 'PAID' }),
      }),
    );
  });

  it('marks the invoice sent when the last active payment is removed', async () => {
    prisma.payment.findMany.mockResolvedValue([]);
    await service.voidPayment('org_1', 'inv_1', 'pay_1');
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountPaid: 0, status: 'SENT' }),
      }),
    );
  });

  it('leaves a cancelled invoice cancelled while correcting the paid amount', async () => {
    prisma.invoice.findFirst.mockResolvedValue({ ...invoice, status: 'CANCELLED' });
    prisma.payment.findMany.mockResolvedValue([]);
    await service.voidPayment('org_1', 'inv_1', 'pay_1');
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountPaid: 0, status: 'CANCELLED' }),
      }),
    );
  });

  it('does not void a payment that belongs to another invoice', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);
    await expect(service.voidPayment('org_1', 'inv_1', 'pay_other')).rejects.toThrow('Payment not found');
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('refuses a second void of the same payment', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay_1',
      amount: 40,
      method: 'CASH',
      voidedAt: new Date(),
    });
    await expect(service.voidPayment('org_1', 'inv_1', 'pay_1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to clear every payment by changing Paid back to Sent', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...invoice,
      status: 'PAID',
      amountPaid: 100,
      total: 100,
      items: [{ quantity: 1, unitPrice: 100 }],
      payments: [
        { id: 'pay_1', amount: 60, voidedAt: null, method: 'CASH' },
        { id: 'pay_2', amount: 40, voidedAt: null, method: 'BANK' },
      ],
    });
    await expect(
      service.update('org_1', 'inv_1', { status: 'SENT' } as never),
    ).rejects.toThrow('Remove the mistaken payment');
    expect(prisma.payment.deleteMany).not.toHaveBeenCalled();
  });
});
