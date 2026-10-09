import { InvoicesService } from './invoices.service';

describe('InvoicesService findAll', () => {
  const prisma = {
    invoice: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ensureRequiredSchema: jest.fn(),
  };
  const service = new InvoicesService(prisma as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.invoice.count.mockResolvedValue(1);
    prisma.ensureRequiredSchema.mockResolvedValue(undefined);
  });

  it('selects list fields and does not select clientRequestId', async () => {
    prisma.invoice.findMany.mockResolvedValue([{ id: 'inv_1', number: 'INV-00001' }]);

    const result = await service.findAll('org_1');

    expect(result.data).toEqual([{ id: 'inv_1', number: 'INV-00001' }]);
    const select = prisma.invoice.findMany.mock.calls[0][0].select as {
      clientRequestId?: boolean;
      fulfillmentEvents?: { select: Record<string, boolean> };
    };
    expect(select.clientRequestId).toBeUndefined();
    expect(select).toEqual(
      expect.objectContaining({
        id: true,
        number: true,
        status: true,
        total: true,
        amountPaid: true,
        currency: true,
        dueDate: true,
        fulfillmentStatus: true,
        localTrackingNumber: true,
        internationalTrackingNumber: true,
        customer: { select: { id: true, name: true } },
      }),
    );
    expect(select.fulfillmentEvents?.select).toEqual({
      id: true,
      status: true,
      action: true,
      createdAt: true,
    });
    expect(prisma.ensureRequiredSchema).not.toHaveBeenCalled();
  });

  it('repairs the schema and retries the list query', async () => {
    prisma.invoice.findMany
      .mockRejectedValueOnce(new Error('column invoices.clientRequestId does not exist'))
      .mockResolvedValueOnce([{ id: 'inv_1' }]);

    const result = await service.findAll('org_1');

    expect(prisma.ensureRequiredSchema).toHaveBeenCalledTimes(1);
    expect(prisma.invoice.findMany).toHaveBeenCalledTimes(2);
    const retried = prisma.invoice.findMany.mock.calls[1][0].select as {
      clientRequestId?: boolean;
      fulfillmentEvents?: unknown;
    };
    expect(retried.clientRequestId).toBeUndefined();
    expect(retried.fulfillmentEvents).toBeDefined();
    expect(result.data).toEqual([{ id: 'inv_1' }]);
  });

  it('falls back to a query without fulfillmentEvents when the retry still fails', async () => {
    prisma.invoice.findMany
      .mockRejectedValueOnce(new Error('invoice_fulfillment_events does not exist'))
      .mockRejectedValueOnce(new Error('invoice_fulfillment_events does not exist'))
      .mockResolvedValueOnce([{ id: 'inv_1', fulfillmentStatus: null }]);

    const result = await service.findAll('org_1');

    expect(prisma.ensureRequiredSchema).toHaveBeenCalledTimes(1);
    expect(prisma.invoice.findMany).toHaveBeenCalledTimes(3);
    const fallbackSelect = prisma.invoice.findMany.mock.calls[2][0].select as {
      clientRequestId?: boolean;
      fulfillmentEvents?: unknown;
      id?: boolean;
    };
    expect(fallbackSelect.fulfillmentEvents).toBeUndefined();
    expect(fallbackSelect.clientRequestId).toBeUndefined();
    expect(fallbackSelect.id).toBe(true);
    expect(result.data).toEqual([{ id: 'inv_1', fulfillmentStatus: null }]);
  });

  it('retries the list when ensureRequiredSchema is not present', async () => {
    const bare = {
      invoice: {
        findMany: jest
          .fn()
          .mockRejectedValueOnce(new Error('missing relation'))
          .mockResolvedValueOnce([{ id: 'inv_2' }]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const bareService = new InvoicesService(bare as never, {} as never);

    const result = await bareService.findAll('org_1');

    expect(result.data).toEqual([{ id: 'inv_2' }]);
    expect(bare.invoice.findMany).toHaveBeenCalledTimes(2);
  });
});
