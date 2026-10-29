import type { Customer, Organization, Product } from '@/lib/api';
import type { DocumentDb } from '@/lib/offline/document-db';
import type { OfflineStorage, OutboxJob, StoredInvoice } from '@/lib/offline/types';

const CATALOG = 'catalog';
const ORGANIZATIONS = 'organizations';
const INVOICES = 'invoices';
const OUTBOX = 'outbox';
const ALIASES = 'aliases';

function invoiceKey(organizationId: string, localId: string) {
  return `${organizationId}:${localId}`;
}

function parseJson<T>(json: string): T {
  return JSON.parse(json) as T;
}

/**
 * SQLite-backed OfflineStorage for the Capacitor app.
 * Pass an opener so tests can use an in-memory document database.
 */
export class SqliteOfflineStorage implements OfflineStorage {
  private dbPromise: Promise<DocumentDb> | null = null;

  constructor(private readonly openDb: () => Promise<DocumentDb>) {}

  private async db(): Promise<DocumentDb> {
    try {
      this.dbPromise ??= this.openDb();
      return await this.dbPromise;
    } catch (error) {
      this.dbPromise = null;
      throw error;
    }
  }

  private async readJson<T>(bucket: string, key: string): Promise<T | null> {
    const row = await (await this.db()).get(bucket, key);
    return row ? parseJson<T>(row.json) : null;
  }

  private async writeJson(
    bucket: string,
    key: string,
    organizationId: string,
    createdAt: number,
    value: unknown,
  ) {
    await (await this.db()).put(bucket, {
      key,
      organizationId,
      createdAt,
      json: JSON.stringify(value),
    });
  }

  async readCustomers(organizationId: string) {
    return (await this.readJson<Customer[]>(CATALOG, `customers:${organizationId}`)) ?? [];
  }

  async writeCustomers(organizationId: string, customers: Customer[]) {
    await this.writeJson(CATALOG, `customers:${organizationId}`, organizationId, 0, customers);
  }

  async readProducts(organizationId: string) {
    return (await this.readJson<Product[]>(CATALOG, `products:${organizationId}`)) ?? [];
  }

  async writeProducts(organizationId: string, products: Product[]) {
    await this.writeJson(CATALOG, `products:${organizationId}`, organizationId, 0, products);
  }

  async readOrganization(organizationId: string) {
    return this.readJson<Organization>(ORGANIZATIONS, organizationId);
  }

  async writeOrganization(organization: Organization) {
    await this.writeJson(ORGANIZATIONS, organization.id, organization.id, 0, organization);
  }

  async listInvoices(organizationId: string) {
    const rows = await (await this.db()).listByOrganization(INVOICES, organizationId);
    return rows.map((row) => parseJson<StoredInvoice>(row.json));
  }

  async getInvoice(organizationId: string, localId: string) {
    return this.readJson<StoredInvoice>(INVOICES, invoiceKey(organizationId, localId));
  }

  async putInvoice(record: StoredInvoice) {
    await this.writeJson(
      INVOICES,
      invoiceKey(record.organizationId, record.localId),
      record.organizationId,
      record.createdAt,
      record,
    );
  }

  async deleteInvoice(organizationId: string, localId: string) {
    await (await this.db()).delete(INVOICES, invoiceKey(organizationId, localId));
  }

  async replaceInvoices(organizationId: string, records: StoredInvoice[]) {
    const db = await this.db();
    await db.deleteByOrganization(INVOICES, organizationId);
    for (const record of records) {
      await db.put(INVOICES, {
        key: invoiceKey(record.organizationId, record.localId),
        organizationId: record.organizationId,
        createdAt: record.createdAt,
        json: JSON.stringify(record),
      });
    }
  }

  async listOutbox(organizationId: string) {
    const rows = await (await this.db()).listByOrganization(OUTBOX, organizationId);
    return rows
      .map((row) => parseJson<OutboxJob>(row.json))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async putOutbox(job: OutboxJob) {
    await this.writeJson(OUTBOX, job.clientRequestId, job.organizationId, job.createdAt, job);
  }

  async deleteOutbox(clientRequestId: string) {
    await (await this.db()).delete(OUTBOX, clientRequestId);
  }

  async rememberAlias(organizationId: string, localId: string, serverId: string) {
    await this.writeJson(ALIASES, invoiceKey(organizationId, localId), organizationId, 0, serverId);
  }

  async resolveAlias(organizationId: string, localId: string) {
    return this.readJson<string>(ALIASES, invoiceKey(organizationId, localId));
  }
}
