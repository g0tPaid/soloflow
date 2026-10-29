import { describe, expect, it } from 'vitest';
import type { Invoice } from '@/lib/api';
import { cacheServerInvoices, mergeInvoiceList } from '@/lib/offline/invoice-list';
import { MemoryOfflineStorage } from '@/lib/offline/memory-store';
import type { StoredInvoice } from '@/lib/offline/types';

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'inv_1',
    organizationId: 'org_1',
    number: 'INV-00001',
    status: 'DRAFT',
    issueDate: '2026-10-08T00:00:00.000Z',
    currency: 'AED',
    subtotal: 10,
    taxAmount: 0,
    shipping: 0,
    discount: 0,
    total: 10,
    createdAt: '2026-10-08T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}

function stored(overrides: Partial<StoredInvoice>): StoredInvoice {
  const localId = overrides.localId ?? 'local-1';
  return {
    organizationId: 'org_1',
    localId,
    clientRequestId: localId,
    syncState: 'pending',
    syncError: null,
    createdAt: 2,
    invoice: invoice({ id: localId, number: 'Pending', clientRequestId: localId, status: 'DRAFT' }),
    ...overrides,
  };
}

describe('mergeInvoiceList', () => {
  it('shows pending invoices ahead of the server page', () => {
    const merged = mergeInvoiceList(
      [invoice({ id: 'srv', number: 'INV-00002' })],
      [stored({ createdAt: 5 })],
      null,
    );
    expect(merged.map((row) => row.number)).toEqual(['Pending', 'INV-00002']);
    expect(merged[0].syncState).toBe('pending');
  });

  it('drops a pending copy once the server page includes that client key', () => {
    const merged = mergeInvoiceList(
      [invoice({ id: 'srv', number: 'INV-00008', clientRequestId: 'local-1' })],
      [stored({ clientRequestId: 'local-1', localId: 'local-1' })],
      null,
    );
    expect(merged.map((row) => row.id)).toEqual(['srv']);
  });

  it('hides pending drafts from the paid filter and keeps them for waiting for payment', () => {
    const local = [stored({})];
    expect(mergeInvoiceList([], local, 'paid')).toEqual([]);
    expect(mergeInvoiceList([], local, 'waiting_for_payment')).toHaveLength(1);
  });
});

describe('cacheServerInvoices', () => {
  it('replaces synced invoices and keeps unsynced ones', async () => {
    const store = new MemoryOfflineStorage();
    await store.putInvoice(
      stored({
        localId: 'old-server',
        clientRequestId: 'old',
        syncState: 'synced',
        invoice: invoice({ id: 'old-server', number: 'INV-00001' }),
      }),
    );
    await store.putInvoice(stored({ localId: 'pending-1', clientRequestId: 'pending-1' }));
    await store.putInvoice(stored({ localId: 'still-pending', clientRequestId: 'still-pending', createdAt: 9 }));

    await cacheServerInvoices(store, 'org_1', [
      invoice({ id: 'srv-2', number: 'INV-00002', clientRequestId: 'pending-1' }),
    ]);

    const rows = await store.listInvoices('org_1');
    expect(rows.map((row) => row.localId).sort()).toEqual(['srv-2', 'still-pending']);
    expect(rows.find((row) => row.localId === 'still-pending')?.syncState).toBe('pending');
    expect(rows.find((row) => row.localId === 'srv-2')?.syncState).toBe('synced');
  });

  it('keeps line items and customer address when the list payload is only a summary', async () => {
    const store = new MemoryOfflineStorage();
    await store.putInvoice(
      stored({
        localId: 'srv-1',
        clientRequestId: 'client-1',
        syncState: 'synced',
        invoice: invoice({
          id: 'srv-1',
          number: 'INV-00009',
          clientRequestId: 'client-1',
          customer: {
            id: 'cus_1',
            name: 'Ada',
            phone: '+971500000000',
            address: { city: 'Dubai' },
          },
          items: [
            {
              id: 'line-1',
              description: 'Widget',
              name: 'Widget',
              quantity: 2,
              unitPrice: 15,
              taxRate: 0,
              amount: 30,
            },
          ],
        }),
      }),
    );

    await cacheServerInvoices(store, 'org_1', [
      invoice({
        id: 'srv-1',
        number: 'INV-00009',
        clientRequestId: 'client-1',
        status: 'SENT',
        customer: { id: 'cus_1', name: 'Ada Lovelace' },
      }),
    ]);

    const saved = await store.getInvoice('org_1', 'srv-1');
    expect(saved?.invoice.status).toBe('SENT');
    expect(saved?.invoice.customer?.name).toBe('Ada Lovelace');
    expect(saved?.invoice.customer?.phone).toBe('+971500000000');
    expect(saved?.invoice.customer?.address).toEqual({ city: 'Dubai' });
    expect(saved?.invoice.items).toEqual([
      expect.objectContaining({ description: 'Widget', quantity: 2, amount: 30 }),
    ]);
  });
});
