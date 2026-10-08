import type { CreateInvoiceInput } from '@flowbooks/shared';
import type { Customer, Invoice, Organization, Product } from '@/lib/api';

/**
 * Device storage used by offline invoice create.
 * IndexedDB implements this in the browser. A Capacitor build can swap in SQLite
 * without changing the outbox or sync logic.
 */
export type SyncState = 'synced' | 'pending' | 'error';

export interface StoredInvoice {
  organizationId: string;
  localId: string;
  clientRequestId: string | null;
  syncState: SyncState;
  syncError: string | null;
  createdAt: number;
  invoice: Invoice;
}

export interface OutboxJob {
  clientRequestId: string;
  organizationId: string;
  localId: string;
  createdAt: number;
  attempts: number;
  status: 'pending' | 'error';
  lastError: string | null;
  /** True when the device already showed a real number and the server should keep it. */
  preserveNumber: boolean;
  payload: CreateInvoiceInput;
}

export type ListedInvoice = Invoice & {
  syncState?: SyncState;
  syncError?: string | null;
};

export interface OfflineStorage {
  readCustomers(organizationId: string): Promise<Customer[]>;
  writeCustomers(organizationId: string, customers: Customer[]): Promise<void>;
  readProducts(organizationId: string): Promise<Product[]>;
  writeProducts(organizationId: string, products: Product[]): Promise<void>;
  readOrganization(organizationId: string): Promise<Organization | null>;
  writeOrganization(organization: Organization): Promise<void>;
  listInvoices(organizationId: string): Promise<StoredInvoice[]>;
  getInvoice(organizationId: string, localId: string): Promise<StoredInvoice | null>;
  putInvoice(record: StoredInvoice): Promise<void>;
  deleteInvoice(organizationId: string, localId: string): Promise<void>;
  replaceInvoices(organizationId: string, records: StoredInvoice[]): Promise<void>;
  listOutbox(organizationId: string): Promise<OutboxJob[]>;
  putOutbox(job: OutboxJob): Promise<void>;
  deleteOutbox(clientRequestId: string): Promise<void>;
  rememberAlias(organizationId: string, localId: string, serverId: string): Promise<void>;
  resolveAlias(organizationId: string, localId: string): Promise<string | null>;
}
