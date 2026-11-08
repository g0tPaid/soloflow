import {
  invoiceMatchesListFilter,
  isInvoiceListFilter,
  isVendorExpenseInvoice,
  type InvoiceListFilter,
} from '@flowbooks/shared';
import { api, type Customer, type Invoice, type PaginatedResult } from '@/lib/api';
import { isLikelyOfflineError } from '@/lib/offline/network';
import { getOfflineStore } from '@/lib/offline/store';
import type { ListedInvoice, OfflineStorage, StoredInvoice } from '@/lib/offline/types';

export function mergeInvoiceList(
  serverInvoices: Invoice[],
  local: StoredInvoice[],
  filter?: InvoiceListFilter | null,
): ListedInvoice[] {
  const serverSales = serverInvoices.filter((invoice) => !isVendorExpenseInvoice(invoice));
  const serverClientIds = new Set(
    serverSales.map((invoice) => invoice.clientRequestId).filter((id): id is string => !!id),
  );
  const pending = local
    .filter((record) => record.syncState === 'pending' || record.syncState === 'error')
    .filter((record) => !isVendorExpenseInvoice(record.invoice))
    .filter((record) => !record.clientRequestId || !serverClientIds.has(record.clientRequestId))
    .filter((record) => !filter || invoiceMatchesListFilter(record.invoice, filter))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((record) => ({
      ...record.invoice,
      syncState: record.syncState,
      syncError: record.syncError,
    }));
  return [...pending, ...serverSales];
}

/** Drop a row that already appeared on an earlier page, including a pending copy of a synced invoice. */
export function dedupeInvoicePages<T extends { id: string; clientRequestId?: string | null }>(pages: T[][]): T[] {
  const seenIds = new Set<string>();
  const seenClientIds = new Set<string>();
  const rows: T[] = [];
  for (const page of pages) {
    for (const row of page) {
      if (seenIds.has(row.id)) continue;
      if (row.clientRequestId && seenClientIds.has(row.clientRequestId)) continue;
      seenIds.add(row.id);
      if (row.clientRequestId) seenClientIds.add(row.clientRequestId);
      rows.push(row);
    }
  }
  return rows;
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
    .filter((invoice) => !isVendorExpenseInvoice(invoice))
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

function mergeCustomer(
  previous?: Customer | null,
  incoming?: Customer | null,
): Customer | null | undefined {
  if (!incoming) return previous;
  if (!previous) return incoming;
  return {
    ...previous,
    ...incoming,
    email: incoming.email ?? previous.email,
    phone: incoming.phone ?? previous.phone,
    taxId: incoming.taxId ?? previous.taxId,
    notes: incoming.notes ?? previous.notes,
    address: incoming.address ?? previous.address,
    currency: incoming.currency ?? previous.currency,
  };
}

/**
 * The invoice list payload has totals and a customer name, not line items.
 * Keep the richer copy already saved from the invoice screen or a Pending draft.
 */
export function mergeCachedInvoice(previous: Invoice | undefined, incoming: Invoice): Invoice {
  if (!previous) return incoming;
  const items = incoming.items && incoming.items.length > 0 ? incoming.items : previous.items;
  const payments = incoming.payments && incoming.payments.length > 0 ? incoming.payments : previous.payments;
  return {
    ...previous,
    ...incoming,
    customer: mergeCustomer(previous.customer, incoming.customer),
    items,
    payments,
    fulfillmentEvents: incoming.fulfillmentEvents ?? previous.fulfillmentEvents,
    clientRequestId: incoming.clientRequestId ?? previous.clientRequestId,
  };
}

export async function cacheServerInvoices(
  store: OfflineStorage,
  organizationId: string,
  invoices: Invoice[],
) {
  const existing = await store.listInvoices(organizationId);
  const byId = new Map(existing.map((record) => [record.localId, record]));
  const byClientId = new Map(
    existing
      .filter((record) => record.clientRequestId)
      .map((record) => [record.clientRequestId as string, record]),
  );

  for (const invoice of invoices) {
    if (isVendorExpenseInvoice(invoice)) continue;
    const previous =
      byId.get(invoice.id) ?? (invoice.clientRequestId ? byClientId.get(invoice.clientRequestId) : undefined);
    if (previous && previous.localId !== invoice.id) {
      await store.deleteInvoice(organizationId, previous.localId);
    }
    await store.putInvoice({
      organizationId,
      localId: invoice.id,
      clientRequestId: invoice.clientRequestId ?? previous?.clientRequestId ?? null,
      syncState: 'synced',
      syncError: null,
      createdAt: new Date(invoice.createdAt).getTime() || previous?.createdAt || Date.now(),
      invoice: mergeCachedInvoice(previous?.invoice, invoice),
    });
  }
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

  const page = input.params?.page ?? 1;
  if (!isOnline()) {
    if (page > 1) {
      return {
        data: [],
        pagination: { page, limit: input.params?.limit ?? 50, total: 0, totalPages: 1 },
      };
    }
    return pageFromLocal(await store.listInvoices(input.organizationId).catch(() => []), filter);
  }

  try {
    const remote = await api.invoices.list(input.token, input.organizationId, input.params);
    await cacheServerInvoices(store, input.organizationId, remote.data).catch(() => undefined);
    const local = page === 1 ? await store.listInvoices(input.organizationId).catch(() => []) : [];
    const sales = remote.data.filter((invoice) => !isVendorExpenseInvoice(invoice));
    const data = page === 1 ? mergeInvoiceList(sales, local, activeFilter(filter)) : sales;
    const extra = Math.max(0, data.length - sales.length);
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
