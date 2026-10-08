import { api, type Customer, type PaginatedResult, type Product } from '@/lib/api';
import { isLikelyOfflineError } from '@/lib/offline/network';
import { getOfflineStore } from '@/lib/offline/store';
import type { OfflineStorage } from '@/lib/offline/types';

function pageOf<T>(data: T[]): PaginatedResult<T> {
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

async function loadCachedList<T>(input: {
  organizationId: string;
  store?: OfflineStorage;
  isOnline?: () => boolean;
  read: (store: OfflineStorage, organizationId: string) => Promise<T[]>;
  write: (store: OfflineStorage, organizationId: string, rows: T[]) => Promise<void>;
  fetchPage: () => Promise<PaginatedResult<T>>;
}): Promise<PaginatedResult<T>> {
  const store = input.store ?? getOfflineStore();
  const isOnline = input.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine);

  if (!isOnline()) {
    const cached = await input.read(store, input.organizationId).catch(() => []);
    return pageOf(cached);
  }

  try {
    const result = await input.fetchPage();
    await input.write(store, input.organizationId, result.data).catch(() => undefined);
    return result;
  } catch (error) {
    if (!isLikelyOfflineError(error)) throw error;
    const cached = await input.read(store, input.organizationId).catch(() => []);
    return pageOf(cached);
  }
}

export function loadCustomers(input: {
  token: string;
  organizationId: string;
  store?: OfflineStorage;
  isOnline?: () => boolean;
}) {
  return loadCachedList<Customer>({
    ...input,
    read: (store, organizationId) => store.readCustomers(organizationId),
    write: (store, organizationId, rows) => store.writeCustomers(organizationId, rows),
    fetchPage: () => api.customers.list(input.token, input.organizationId, { limit: 100 }),
  });
}

export function loadProducts(input: {
  token: string;
  organizationId: string;
  store?: OfflineStorage;
  isOnline?: () => boolean;
}) {
  return loadCachedList<Product>({
    ...input,
    read: (store, organizationId) => store.readProducts(organizationId),
    write: (store, organizationId, rows) => store.writeProducts(organizationId, rows),
    fetchPage: () => api.products.list(input.token, input.organizationId, { limit: 100 }),
  });
}
