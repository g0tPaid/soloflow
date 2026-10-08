import { invoiceMatchesListFilter, isInvoiceListFilter, type InvoiceListFilter } from '@flowbooks/shared';
import { api, type Invoice, type PaginatedResult } from '@/lib/api';
import { isLikelyOfflineError } from '@/lib/offline/network';
import { getOfflineStore } from '@/lib/offline/store';
import type { ListedInvoice, OfflineStorage, StoredInvoice } from '@/lib/offline/types';

export function mergeInvoiceList(
  serverInvoices: Invoice[],
  local: StoredInvoice[],
  filter?: InvoiceListFilter | null,
): ListedInvoice[] {
  const serverClientIds = new Set(
    serverInvoices.map((invoice) => invoice.clientRequestId).filter((id): id is string => !!id),
  );
  const pending = local
    .filter((record) => record.syncState === 'pending' || record.syncState === 'error')
    .filter((record) => !record.clientRequestId || !serverClientIds.has(record.clientRequestId))
    .filter((record) => !filter || invoiceMatchesListFilter(record.invoice, filter))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((record) => ({
      ...record.invoice,
      syncState: record.syncState,
      syncError: record.syncError,
    }));
  return [...pending, ...serverInvoices];
}

function activeFilter(listFilter?: string): InvoiceListFilter | null {
  if (!listFilter || !isInvoiceListFilter(listFilter) || listFilter === 'all') return null;
  return listFilter;
}

function pageFromLocal(records: StoredInvoice[], listFilter?: string): PaginatedResult<ListedInvoice> {
  const filter = activeFilter(listFilter);
  const synced = records
    .filter((record) => record.syncState === 'synced')
    .map((record) => record.invoice)
    .filter((invoice) => !filter || invoiceMatchesListFilter(invoice, filter));
  const data = mergeInvoiceList(synced, records, filter);
  return {
    data,
    pagination: {
      page: 1,
      limit: Math.max(data.length, 1),
      total: data.length,
      totalPages: 1,
    },
  };
}

export async function cacheServerInvoices(
  store: OfflineStorage,
  organizationId: string,
  invoices: Invoice[],
) {
  const existing = await store.listInvoices(organizationId);
  const serverClientIds = new Set(
    invoices.map((invoice) => invoice.clientRequestId).filter((id): id is string => !!id),
  );
  const pending = existing.filter(
    (record) =>
      (record.syncState === 'pending' || record.syncState === 'error') &&
      !(record.clientRequestId && serverClientIds.has(record.clientRequestId)),
  );
  const synced = invoices.map((invoice) => ({
    organizationId,
    localId: invoice.id,
    clientRequestId: invoice.clientRequestId ?? null,
    syncState: 'synced' as const,
    syncError: null,
    createdAt: new Date(invoice.createdAt).getTime() || Date.now(),
    invoice,
  }));
  await store.replaceInvoices(organizationId, [...pending, ...synced]);
}

export async function loadInvoiceList(input: {
  token: string;
  organizationId: string;
  params?: { page?: number; limit?: number; fulfillmentStatus?: string; sort?: string; listFilter?: string };
  store?: OfflineStorage;
  isOnline?: () => boolean;
}): Promise<PaginatedResult<ListedInvoice>> {
  const store = input.store ?? getOfflineStore();
  const isOnline = input.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine);
  const filter = input.params?.listFilter;

  if (!isOnline()) {
    return pageFromLocal(await store.listInvoices(input.organizationId).catch(() => []), filter);
  }

  try {
    const remote = await api.invoices.list(input.token, input.organizationId, input.params);
    if (!filter && !input.params?.fulfillmentStatus) {
      await cacheServerInvoices(store, input.organizationId, remote.data).catch(() => undefined);
    }
    const local = await store.listInvoices(input.organizationId).catch(() => []);
    const data = mergeInvoiceList(remote.data, local, activeFilter(filter));
    const extra = Math.max(0, data.length - remote.data.length);
    return {
      ...remote,
      data,
      pagination: {
        ...remote.pagination,
        total: remote.pagination.total + extra,
      },
    };
  } catch (error) {
    if (!isLikelyOfflineError(error)) throw error;
    return pageFromLocal(await store.listInvoices(input.organizationId).catch(() => []), filter);
  }
}
