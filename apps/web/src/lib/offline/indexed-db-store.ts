import type { Customer, Organization, Product } from '@/lib/api';
import type { OfflineStorage, OutboxJob, StoredInvoice } from '@/lib/offline/types';

const DB_NAME = 'soloflow-offline';
const DB_VERSION = 1;

type InvoiceRow = StoredInvoice & { key: string };

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('catalog')) db.createObjectStore('catalog');
      if (!db.objectStoreNames.contains('organizations')) db.createObjectStore('organizations');
      if (!db.objectStoreNames.contains('invoices')) {
        const store = db.createObjectStore('invoices', { keyPath: 'key' });
        store.createIndex('byOrg', 'organizationId', { unique: false });
      }
      if (!db.objectStoreNames.contains('outbox')) {
        const store = db.createObjectStore('outbox', { keyPath: 'clientRequestId' });
        store.createIndex('byOrg', 'organizationId', { unique: false });
      }
      if (!db.objectStoreNames.contains('aliases')) db.createObjectStore('aliases');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error);
    };
  });
  return databasePromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function invoiceKey(organizationId: string, localId: string) {
  return `${organizationId}:${localId}`;
}

/**
 * IndexedDB implementation of OfflineStorage.
 * Transactions stay inside one event-loop turn so they do not auto-commit early.
 */
export class IndexedDbOfflineStorage implements OfflineStorage {
  async readCustomers(organizationId: string) {
    const db = await openDatabase();
    const row = await requestToPromise(
      db.transaction('catalog').objectStore('catalog').get(`customers:${organizationId}`),
    );
    return (row as Customer[] | undefined) ?? [];
  }

  async writeCustomers(organizationId: string, customers: Customer[]) {
    const db = await openDatabase();
    const transaction = db.transaction('catalog', 'readwrite');
    transaction.objectStore('catalog').put(customers, `customers:${organizationId}`);
    await transactionDone(transaction);
  }

  async readProducts(organizationId: string) {
    const db = await openDatabase();
    const row = await requestToPromise(
      db.transaction('catalog').objectStore('catalog').get(`products:${organizationId}`),
    );
    return (row as Product[] | undefined) ?? [];
  }

  async writeProducts(organizationId: string, products: Product[]) {
    const db = await openDatabase();
    const transaction = db.transaction('catalog', 'readwrite');
    transaction.objectStore('catalog').put(products, `products:${organizationId}`);
    await transactionDone(transaction);
  }

  async readOrganization(organizationId: string) {
    const db = await openDatabase();
    const row = await requestToPromise(
      db.transaction('organizations').objectStore('organizations').get(organizationId),
    );
    return (row as Organization | undefined) ?? null;
  }

  async writeOrganization(organization: Organization) {
    const db = await openDatabase();
    const transaction = db.transaction('organizations', 'readwrite');
    transaction.objectStore('organizations').put(organization, organization.id);
    await transactionDone(transaction);
  }

  async listInvoices(organizationId: string) {
    const db = await openDatabase();
    const rows = await requestToPromise(
      db.transaction('invoices').objectStore('invoices').index('byOrg').getAll(organizationId),
    );
    return (rows as InvoiceRow[]).map(({ key: _key, ...record }) => record);
  }

  async getInvoice(organizationId: string, localId: string) {
    const db = await openDatabase();
    const row = await requestToPromise(
      db.transaction('invoices').objectStore('invoices').get(invoiceKey(organizationId, localId)),
    );
    if (!row) return null;
    const { key: _key, ...record } = row as InvoiceRow;
    return record;
  }

  async putInvoice(record: StoredInvoice) {
    const db = await openDatabase();
    const transaction = db.transaction('invoices', 'readwrite');
    const row: InvoiceRow = { ...record, key: invoiceKey(record.organizationId, record.localId) };
    transaction.objectStore('invoices').put(row);
    await transactionDone(transaction);
  }

  async deleteInvoice(organizationId: string, localId: string) {
    const db = await openDatabase();
    const transaction = db.transaction('invoices', 'readwrite');
    transaction.objectStore('invoices').delete(invoiceKey(organizationId, localId));
    await transactionDone(transaction);
  }

  async replaceInvoices(organizationId: string, records: StoredInvoice[]) {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('invoices', 'readwrite');
      const store = transaction.objectStore('invoices');
      const existing = store.index('byOrg').getAllKeys(organizationId);
      existing.onsuccess = () => {
        for (const key of existing.result) store.delete(key);
        for (const record of records) {
          const row: InvoiceRow = { ...record, key: invoiceKey(record.organizationId, record.localId) };
          store.put(row);
        }
      };
      existing.onerror = () => reject(existing.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async listOutbox(organizationId: string) {
    const db = await openDatabase();
    const rows = await requestToPromise(
      db.transaction('outbox').objectStore('outbox').index('byOrg').getAll(organizationId),
    );
    return (rows as OutboxJob[]).sort((a, b) => a.createdAt - b.createdAt);
  }

  async putOutbox(job: OutboxJob) {
    const db = await openDatabase();
    const transaction = db.transaction('outbox', 'readwrite');
    transaction.objectStore('outbox').put(job);
    await transactionDone(transaction);
  }

  async deleteOutbox(clientRequestId: string) {
    const db = await openDatabase();
    const transaction = db.transaction('outbox', 'readwrite');
    transaction.objectStore('outbox').delete(clientRequestId);
    await transactionDone(transaction);
  }

  async rememberAlias(organizationId: string, localId: string, serverId: string) {
    const db = await openDatabase();
    const transaction = db.transaction('aliases', 'readwrite');
    transaction.objectStore('aliases').put(serverId, invoiceKey(organizationId, localId));
    await transactionDone(transaction);
  }

  async resolveAlias(organizationId: string, localId: string) {
    const db = await openDatabase();
    const value = await requestToPromise(
      db.transaction('aliases').objectStore('aliases').get(invoiceKey(organizationId, localId)),
    );
    return (value as string | undefined) ?? null;
  }
}
