import { api, type Invoice } from '@/lib/api';
import { isLikelyOfflineError, SyncOfflineError } from '@/lib/offline/network';
import { getOfflineStore } from '@/lib/offline/store';
import type { OfflineStorage, SyncState } from '@/lib/offline/types';

export interface InvoiceScreenData {
  invoice: Invoice;
  syncState: SyncState;
  syncError: string | null;
  aliasId?: string;
}

export async function loadInvoiceScreen(input: {
  token: string;
  organizationId: string;
  invoiceId: string;
  store?: OfflineStorage;
  isOnline?: () => boolean;
}): Promise<InvoiceScreenData> {
  const store = input.store ?? getOfflineStore();
  const isOnline = input.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine);
  const local = await store.getInvoice(input.organizationId, input.invoiceId).catch(() => null);

  if (local && local.syncState !== 'synced') {
    return { invoice: local.invoice, syncState: local.syncState, syncError: local.syncError };
  }

  if (isOnline()) {
    try {
      const invoice = await api.invoices.get(input.token, input.organizationId, input.invoiceId);
      await store
        .putInvoice({
          organizationId: input.organizationId,
          localId: invoice.id,
          clientRequestId: invoice.clientRequestId ?? null,
          syncState: 'synced',
          syncError: null,
          createdAt: new Date(invoice.createdAt).getTime() || Date.now(),
          invoice,
        })
        .catch(() => undefined);
      return { invoice, syncState: 'synced', syncError: null };
    } catch (error) {
      if (!isLikelyOfflineError(error)) {
        const alias = await store.resolveAlias(input.organizationId, input.invoiceId).catch(() => null);
        if (alias) {
          const invoice = await api.invoices.get(input.token, input.organizationId, alias);
          return { invoice, syncState: 'synced', syncError: null, aliasId: alias };
        }
        if (local) return { invoice: local.invoice, syncState: 'synced', syncError: null };
        throw error;
      }
    }
  }

  if (local) return { invoice: local.invoice, syncState: local.syncState, syncError: local.syncError };

  const alias = await store.resolveAlias(input.organizationId, input.invoiceId).catch(() => null);
  if (alias) {
    const aliased = await store.getInvoice(input.organizationId, alias).catch(() => null);
    if (aliased) {
      return { invoice: aliased.invoice, syncState: 'synced', syncError: null, aliasId: alias };
    }
  }

  if (!isOnline()) {
    throw new SyncOfflineError('This invoice is not saved on this device yet.');
  }
  throw new Error('Invoice not found');
}
