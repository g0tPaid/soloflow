import { InvoicesService } from './invoices.service';

describe('InvoicesService fulfillment clear', () => {
  const existing = {
    id: 'inv_1',
    organizationId: 'org_1',
    status: 'DRAFT',
    fulfillmentStatus: 'LOCAL_ORDERING_COMPLETED',
    discount: 0,
    shipping: 0,
    taxRate: 0,
    amountPaid: 0,
    items: [{ quantity: 1, unitPrice: 10 }],
    payments: [],
    customer: { id: 'cus_1' },
    fulfillmentEvents: [],
  };

  const prisma = {
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new InvoicesService(prisma as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.invoice.findFirst.mockResolvedValue(existing);
    prisma.invoice.update.mockImplementation(async ({ data }: { data: { fulfillmentStatus?: string | null } }) => ({
      ...existing,
      fulfillmentStatus: data.fulfillmentStatus,
    }));
  });

  it('writes null and an OFF event when the active stage is cleared', async () => {
    await service.update('org_1', 'inv_1', { fulfillmentStatus: null });

    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv_1' },
        data: expect.objectContaining({
          fulfillmentStatus: null,
          fulfillmentEvents: {
            create: [
              expect.objectContaining({
                status: 'LOCAL_ORDERING_COMPLETED',
                action: 'OFF',
              }),
            ],
          },
        }),
      }),
    );
  });

  it('selects a different stage and leaves fulfillment alone when the field is omitted', async () => {
    await service.update('org_1', 'inv_1', { fulfillmentStatus: 'QC_COMPLETED' });
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fulfillmentStatus: 'QC_COMPLETED',
          fulfillmentEvents: {
            create: [
              expect.objectContaining({ status: 'LOCAL_ORDERING_COMPLETED', action: 'OFF' }),
              expect.objectContaining({ status: 'QC_COMPLETED', action: 'ON' }),
            ],
          },
        }),
      }),
    );

    prisma.invoice.update.mockClear();
    await service.update('org_1', 'inv_1', { notes: 'hello' });
    const data = prisma.invoice.update.mock.calls[0][0].data as { fulfillmentStatus?: unknown };
    expect(data.fulfillmentStatus).toBeUndefined();
  });
});
