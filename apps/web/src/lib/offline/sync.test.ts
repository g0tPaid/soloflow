import { describe, expect, it, vi } from 'vitest';
import type { CreateInvoiceInput } from '@flowbooks/shared';
import type { Invoice } from '@/lib/api';
import { createInvoiceWithOfflineFallback } from '@/lib/offline/create-invoice';
import { MemoryOfflineStorage } from '@/lib/offline/memory-store';
import { SyncOfflineError } from '@/lib/offline/network';
import { flushOutbox, invoiceCreateBodyForSync } from '@/lib/offline/sync';
import type { OutboxJob } from '@/lib/offline/types';

const data: CreateInvoiceInput = {
  customerId: 'cus_1',
  number: 'INV-00007',
  currency: 'AED',
  items: [{ description: 'Widget', name: 'Widget', quantity: 2, unitPrice: 10, taxRate: 0 }],
};

function job(overrides: Partial<OutboxJob> = {}): OutboxJob {
  return {
    clientRequestId: 'client-key-1',
    organizationId: 'org_1',
    localId: 'client-key-1',
    createdAt: 1,
    attempts: 0,
    status: 'pending',
    lastError: null,
    preserveNumber: false,
    payload: { ...data, clientRequestId: 'client-key-1', number: undefined },
    ...overrides,
  };
}

function serverInvoice(id: string, number: string, clientRequestId: string): Invoice {
  return {
    id,
    organizationId: 'org_1',
    customerId: 'cus_1',
    number,
    status: 'DRAFT',
    issueDate: '2026-10-08T00:00:00.000Z',
    currency: 'AED',
    subtotal: 20,
    taxAmount: 0,
    taxRate: 0,
    shipping: 0,
    discount: 0,
    total: 20,
    amountPaid: 0,
    createdAt: '2026-10-08T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    clientRequestId,
  };
}

describe('invoiceCreateBodyForSync', () => {
  it('omits provisional numbers so the server assigns one', () => {
    const body = invoiceCreateBodyForSync(
      job({ payload: { ...data, number: 'Pending', clientRequestId: 'client-key-1' } }),
    );
    expect(body.number).toBeUndefined();
    expect(body.clientRequestId).toBe('client-key-1');
  });

  it('keeps a number from an online attempt that never got a response', () => {
    const body = invoiceCreateBodyForSync(
      job({
        preserveNumber: true,
        payload: { ...data, clientRequestId: 'client-key-1' },
      }),
    );
    expect(body.number).toBe('INV-00007');
  });
});

describe('flushOutbox', () => {
  it('sends queued creates in order and replaces local invoices with the server record', async () => {
    const store = new MemoryOfflineStorage();
    await store.putOutbox(job({ clientRequestId: 'first', localId: 'first', createdAt: 1 }));
    await store.putOutbox(
      job({
        clientRequestId: 'second',
        localId: 'second',
        createdAt: 2,
        payload: { ...data, clientRequestId: 'second', number: undefined },
      }),
    );
    await store.putInvoice({
      organizationId: 'org_1',
      localId: 'first',
      clientRequestId: 'first',
      syncState: 'pending',
      syncError: null,
      createdAt: 1,
      invoice: serverInvoice('first', 'Pending', 'first'),
    });
    await store.putInvoice({
      organizationId: 'org_1',
      localId: 'second',
      clientRequestId: 'second',
      syncState: 'pending',
      syncError: null,
      createdAt: 2,
      invoice: serverInvoice('second', 'Pending', 'second'),
    });

    const createInvoice = vi.fn(async (body: CreateInvoiceInput) =>
      serverInvoice(`srv-${body.clientRequestId}`, body.clientRequestId === 'first' ? 'INV-00010' : 'INV-00011', body.clientRequestId!),
    );

    const result = await flushOutbox(store, 'org_1', { createInvoice });

    expect(result).toEqual({ synced: 2, failed: 0, stopped: null });
    expect(createInvoice.mock.calls.map((call) => call[0].clientRequestId)).toEqual(['first', 'second']);
    expect(await store.listOutbox('org_1')).toEqual([]);
    expect(await store.getInvoice('org_1', 'first')).toBeNull();
    const synced = await store.getInvoice('org_1', 'srv-first');
    expect(synced?.invoice.number).toBe('INV-00010');
    expect(synced?.syncState).toBe('synced');
    expect(await store.resolveAlias('org_1', 'first')).toBe('srv-first');

    createInvoice.mockClear();
    const again = await flushOutbox(store, 'org_1', { createInvoice });
    expect(again.synced).toBe(0);
    expect(createInvoice).not.toHaveBeenCalled();
  });

  it('keeps the job queued when the network fails and continues only after a retry', async () => {
    const store = new MemoryOfflineStorage();
    await store.putOutbox(job());
    await store.putOutbox(job({ clientRequestId: 'second', localId: 'second', createdAt: 2 }));
    await store.putInvoice({
      organizationId: 'org_1',
      localId: 'client-key-1',
      clientRequestId: 'client-key-1',
      syncState: 'pending',
      syncError: null,
      createdAt: 1,
      invoice: serverInvoice('client-key-1', 'Pending', 'client-key-1'),
    });

    const createInvoice = vi
      .fn()
      .mockRejectedValueOnce(new SyncOfflineError('Failed to fetch'))
      .mockResolvedValueOnce(serverInvoice('srv-1', 'INV-00010', 'client-key-1'))
      .mockRejectedValueOnce(new SyncOfflineError('Failed to fetch'));

    const stopped = await flushOutbox(store, 'org_1', { createInvoice });
    expect(stopped.stopped).toBe('offline');
    expect(await store.listOutbox('org_1')).toHaveLength(2);
    expect((await store.getInvoice('org_1', 'client-key-1'))?.syncState).toBe('pending');
    expect(createInvoice).toHaveBeenCalledTimes(1);

    const retried = await flushOutbox(store, 'org_1', { createInvoice });
    expect(retried).toEqual({ synced: 1, failed: 0, stopped: 'offline' });
    expect(createInvoice).toHaveBeenCalledTimes(3);
    expect((await store.listOutbox('org_1')).map((entry) => entry.clientRequestId)).toEqual(['second']);
  });

  it('marks an API rejection as an error and retries that same key later', async () => {
    const store = new MemoryOfflineStorage();
    await store.putOutbox(job());
    await store.putInvoice({
      organizationId: 'org_1',
      localId: 'client-key-1',
      clientRequestId: 'client-key-1',
      syncState: 'pending',
      syncError: null,
      createdAt: 1,
      invoice: serverInvoice('client-key-1', 'Pending', 'client-key-1'),
    });

    const createInvoice = vi
      .fn()
      .mockRejectedValueOnce(new Error('Customer is required'))
      .mockResolvedValueOnce(serverInvoice('srv-1', 'INV-00012', 'client-key-1'));

    const failed = await flushOutbox(store, 'org_1', { createInvoice });
    expect(failed).toEqual({ synced: 0, failed: 1, stopped: null });
    const queued = await store.listOutbox('org_1');
    expect(queued[0]).toMatchObject({ status: 'error', lastError: 'Customer is required', attempts: 1 });
    expect((await store.getInvoice('org_1', 'client-key-1'))?.syncState).toBe('error');

    const retried = await flushOutbox(store, 'org_1', { createInvoice });
    expect(retried.synced).toBe(1);
    expect(createInvoice).toHaveBeenCalledTimes(2);
    expect(createInvoice.mock.calls[0][0].clientRequestId).toBe('client-key-1');
    expect(createInvoice.mock.calls[1][0].clientRequestId).toBe('client-key-1');
    expect(await store.listOutbox('org_1')).toEqual([]);
    expect((await store.getInvoice('org_1', 'srv-1'))?.invoice.number).toBe('INV-00012');
  });
});

describe('createInvoiceWithOfflineFallback', () => {
  it('saves a pending invoice locally and does not call the API while offline', async () => {
    const store = new MemoryOfflineStorage();
    const createInvoice = vi.fn();

    const created = await createInvoiceWithOfflineFallback({
      token: 'token',
      organizationId: 'org_1',
      data,
      customer: { id: 'cus_1', name: 'Ada' },
      store,
      isOnline: () => false,
      createInvoice,
      clientRequestId: 'client-key-9',
    });

    expect(createInvoice).not.toHaveBeenCalled();
    expect(created.offlinePending).toBe(true);
    expect(created.number).toBe('Pending');
    expect(created.customer?.name).toBe('Ada');
    expect(created.total).toBe(20);
    const queued = await store.listOutbox('org_1');
    expect(queued).toHaveLength(1);
    expect(queued[0].preserveNumber).toBe(false);
    expect(queued[0].payload.number).toBeUndefined();
    expect(queued[0].payload.clientRequestId).toBe('client-key-9');
  });

  it('creates online with the same client key and does not queue', async () => {
    const store = new MemoryOfflineStorage();
    const createInvoice = vi.fn(async (body: CreateInvoiceInput) =>
      serverInvoice('srv-1', body.number ?? 'INV-00001', body.clientRequestId!),
    );

    const created = await createInvoiceWithOfflineFallback({
      token: 'token',
      organizationId: 'org_1',
      data,
      store,
      isOnline: () => true,
      createInvoice,
      clientRequestId: 'client-key-3',
    });

    expect(created.offlinePending).toBeUndefined();
    expect(created.number).toBe('INV-00007');
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({ clientRequestId: 'client-key-3', number: 'INV-00007' }));
    expect(await store.listOutbox('org_1')).toEqual([]);
  });

  it('queues the same client key when the online request never reaches the API', async () => {
    const store = new MemoryOfflineStorage();
    const createInvoice = vi.fn(async () => {
      throw new Error('Cannot reach SoloFlow API (Failed to fetch)');
    });

    const created = await createInvoiceWithOfflineFallback({
      token: 'token',
      organizationId: 'org_1',
      data,
      store,
      isOnline: () => true,
      createInvoice,
      clientRequestId: 'client-key-4',
    });

    expect(created.offlinePending).toBe(true);
    expect(created.number).toBe('INV-00007');
    const queued = await store.listOutbox('org_1');
    expect(queued[0]).toMatchObject({
      clientRequestId: 'client-key-4',
      preserveNumber: true,
      status: 'pending',
    });
    expect(queued[0].payload.number).toBe('INV-00007');
  });

  it('does not queue validation errors from the API', async () => {
    const store = new MemoryOfflineStorage();
    const createInvoice = vi.fn(async () => {
      throw new Error('Customer is required');
    });

    await expect(
      createInvoiceWithOfflineFallback({
        token: 'token',
        organizationId: 'org_1',
        data,
        store,
        isOnline: () => true,
        createInvoice,
        clientRequestId: 'client-key-5',
      }),
    ).rejects.toThrow('Customer is required');
    expect(await store.listOutbox('org_1')).toEqual([]);
  });
});
