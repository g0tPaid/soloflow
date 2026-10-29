import { describe, expect, it, vi } from 'vitest';
import type { Invoice, Organization } from '@/lib/api';
import { MemoryOfflineStorage } from '@/lib/offline/memory-store';
import { OfflinePdfError, resolveInvoicePdfFile } from '@/lib/offline/resolve-invoice-pdf';
import type { StoredInvoice } from '@/lib/offline/types';

const org: Organization = {
  id: 'org_1',
  name: 'Practical Things',
  slug: 'practical-things',
  logo: 'data:image/png;base64,aaaa',
  settings: {
    currency: 'AED',
    timezone: 'Asia/Dubai',
    branding: { tagline: 'Made here', invoiceAccent: '#2563EB' },
  },
};

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'local-1',
    organizationId: 'org_1',
    number: 'Pending',
    status: 'DRAFT',
    issueDate: '2026-10-08T00:00:00.000Z',
    currency: 'AED',
    subtotal: 20,
    taxAmount: 0,
    shipping: 0,
    discount: 0,
    total: 20,
    createdAt: '2026-10-08T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    customer: { id: 'cus_1', name: 'Ada' },
    items: [
      {
        id: 'line-1',
        description: 'Widget',
        name: 'Widget',
        quantity: 2,
        unitPrice: 10,
        taxRate: 0,
        amount: 20,
      },
    ],
    clientRequestId: 'local-1',
    ...overrides,
  };
}

function stored(overrides: Partial<StoredInvoice> = {}): StoredInvoice {
  const row = invoice();
  return {
    organizationId: 'org_1',
    localId: row.id,
    clientRequestId: row.clientRequestId ?? null,
    syncState: 'pending',
    syncError: null,
    createdAt: 1,
    invoice: row,
    ...overrides,
  };
}

function pdfFile(name: string) {
  return new File(['%PDF-1.4'], name, { type: 'application/pdf' });
}

describe('resolveInvoicePdfFile', () => {
  it('renders a Pending invoice from the device without calling the server', async () => {
    const store = new MemoryOfflineStorage();
    await store.writeOrganization(org);
    await store.putInvoice(stored());
    const fetchServer = vi.fn();
    const renderLocal = vi.fn().mockResolvedValue(pdfFile('Pending.pdf'));

    const file = await resolveInvoicePdfFile({
      documentId: 'local-1',
      organizationId: 'org_1',
      filename: 'Pending.pdf',
      store,
      isOnline: () => false,
      fetchServer,
      renderLocal,
    });

    expect(fetchServer).not.toHaveBeenCalled();
    expect(renderLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        number: 'Pending',
        items: [expect.objectContaining({ description: 'Widget', amount: 20 })],
      }),
      org,
      'Pending.pdf',
    );
    expect(file.name).toBe('Pending.pdf');
  });

  it('keeps the server PDF when the invoice is synced and the network is up', async () => {
    const store = new MemoryOfflineStorage();
    await store.writeOrganization(org);
    await store.putInvoice(
      stored({
        localId: 'inv_1',
        syncState: 'synced',
        invoice: invoice({ id: 'inv_1', number: 'INV-00004' }),
      }),
    );
    const fetchServer = vi.fn().mockResolvedValue(pdfFile('INV-00004.pdf'));
    const renderLocal = vi.fn();

    const file = await resolveInvoicePdfFile({
      documentId: 'inv_1',
      organizationId: 'org_1',
      filename: 'INV-00004.pdf',
      store,
      isOnline: () => true,
      fetchServer,
      renderLocal,
    });

    expect(file.name).toBe('INV-00004.pdf');
    expect(fetchServer).toHaveBeenCalledWith('inv_1', 'org_1', 'INV-00004.pdf');
    expect(renderLocal).not.toHaveBeenCalled();
  });

  it('does not ask the server for a Pending draft even while online', async () => {
    const store = new MemoryOfflineStorage();
    await store.putInvoice(stored());
    const fetchServer = vi.fn();
    const renderLocal = vi.fn().mockResolvedValue(pdfFile('Pending.pdf'));

    await resolveInvoicePdfFile({
      documentId: 'local-1',
      organizationId: 'org_1',
      filename: 'Pending.pdf',
      store,
      isOnline: () => true,
      fetchServer,
      renderLocal,
    });

    expect(fetchServer).not.toHaveBeenCalled();
    expect(renderLocal).toHaveBeenCalled();
  });

  it('falls back to the saved invoice when the server PDF request cannot reach the network', async () => {
    const store = new MemoryOfflineStorage();
    await store.writeOrganization(org);
    await store.putInvoice(
      stored({
        localId: 'inv_9',
        syncState: 'synced',
        invoice: invoice({ id: 'inv_9', number: 'INV-00009' }),
      }),
    );
    const fetchServer = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const renderLocal = vi.fn().mockResolvedValue(pdfFile('INV-00009.pdf'));

    await resolveInvoicePdfFile({
      documentId: 'inv_9',
      organizationId: 'org_1',
      filename: 'INV-00009.pdf',
      store,
      isOnline: () => true,
      fetchServer,
      renderLocal,
    });

    expect(renderLocal).toHaveBeenCalledWith(
      expect.objectContaining({ number: 'INV-00009' }),
      org,
      'INV-00009.pdf',
    );
  });

  it('does not replace a server error with a local PDF', async () => {
    const store = new MemoryOfflineStorage();
    await store.putInvoice(
      stored({
        localId: 'inv_9',
        syncState: 'synced',
        invoice: invoice({ id: 'inv_9', number: 'INV-00009' }),
      }),
    );
    const fetchServer = vi.fn().mockRejectedValue(new Error('Could not generate PDF. Please try again.'));
    const renderLocal = vi.fn();

    await expect(
      resolveInvoicePdfFile({
        documentId: 'inv_9',
        organizationId: 'org_1',
        filename: 'INV-00009.pdf',
        store,
        isOnline: () => true,
        fetchServer,
        renderLocal,
      }),
    ).rejects.toThrow('Could not generate PDF');
    expect(renderLocal).not.toHaveBeenCalled();
  });

  it('uses a synced copy stored under the server id when opened by the old local id', async () => {
    const store = new MemoryOfflineStorage();
    await store.writeOrganization(org);
    await store.putInvoice(
      stored({
        localId: 'inv_server',
        syncState: 'synced',
        invoice: invoice({ id: 'inv_server', number: 'INV-00012' }),
      }),
    );
    await store.rememberAlias('org_1', 'local-1', 'inv_server');
    const renderLocal = vi.fn().mockResolvedValue(pdfFile('INV-00012.pdf'));

    await resolveInvoicePdfFile({
      documentId: 'local-1',
      organizationId: 'org_1',
      filename: 'INV-00012.pdf',
      store,
      isOnline: () => false,
      fetchServer: vi.fn(),
      renderLocal,
    });

    expect(renderLocal).toHaveBeenCalledWith(
      expect.objectContaining({ number: 'INV-00012' }),
      org,
      'INV-00012.pdf',
    );
  });

  it('still renders when branding has not been cached yet', async () => {
    const store = new MemoryOfflineStorage();
    await store.putInvoice(stored());
    const renderLocal = vi.fn().mockResolvedValue(pdfFile('Pending.pdf'));

    await resolveInvoicePdfFile({
      documentId: 'local-1',
      organizationId: 'org_1',
      filename: 'Pending.pdf',
      store,
      isOnline: () => false,
      fetchServer: vi.fn(),
      renderLocal,
    });

    expect(renderLocal).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'org_1', name: 'Company' }),
      'Pending.pdf',
    );
  });

  it('refuses an invoice that is not on the device', async () => {
    const store = new MemoryOfflineStorage();
    await expect(
      resolveInvoicePdfFile({
        documentId: 'missing',
        organizationId: 'org_1',
        filename: 'missing.pdf',
        store,
        isOnline: () => false,
        fetchServer: vi.fn(),
        renderLocal: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(OfflinePdfError);
  });
});
