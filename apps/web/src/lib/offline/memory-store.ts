import type { Customer, Organization, Product } from '@/lib/api';
import type { OfflineStorage, OutboxJob, StoredInvoice } from '@/lib/offline/types';

/** In-memory OfflineStorage for tests and for calls that happen without IndexedDB. */
export class MemoryOfflineStorage implements OfflineStorage {
  customers = new Map<string, Customer[]>();
  products = new Map<string, Product[]>();
  organizations = new Map<string, Organization>();
  invoices = new Map<string, StoredInvoice>();
  outbox = new Map<string, OutboxJob>();
  aliases = new Map<string, string>();

  private invoiceKey(organizationId: string, localId: string) {
    return `${organizationId}:${localId}`;
  }

  async readCustomers(organizationId: string) {
    return this.customers.get(organizationId) ?? [];
  }

  async writeCustomers(organizationId: string, customers: Customer[]) {
    this.customers.set(organizationId, customers);
  }

  async readProducts(organizationId: string) {
    return this.products.get(organizationId) ?? [];
  }

  async writeProducts(organizationId: string, products: Product[]) {
    this.products.set(organizationId, products);
  }

  async readOrganization(organizationId: string) {
    return this.organizations.get(organizationId) ?? null;
  }

  async writeOrganization(organization: Organization) {
    this.organizations.set(organization.id, organization);
  }

  async listInvoices(organizationId: string) {
    return [...this.invoices.values()].filter((record) => record.organizationId === organizationId);
  }

  async getInvoice(organizationId: string, localId: string) {
    return this.invoices.get(this.invoiceKey(organizationId, localId)) ?? null;
  }

  async putInvoice(record: StoredInvoice) {
    this.invoices.set(this.invoiceKey(record.organizationId, record.localId), record);
  }

  async deleteInvoice(organizationId: string, localId: string) {
    this.invoices.delete(this.invoiceKey(organizationId, localId));
  }

  async replaceInvoices(organizationId: string, records: StoredInvoice[]) {
    for (const record of [...this.invoices.values()]) {
      if (record.organizationId === organizationId) {
        this.invoices.delete(this.invoiceKey(organizationId, record.localId));
      }
    }
    for (const record of records) {
      await this.putInvoice(record);
    }
  }

  async listOutbox(organizationId: string) {
    return [...this.outbox.values()]
      .filter((job) => job.organizationId === organizationId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async putOutbox(job: OutboxJob) {
    this.outbox.set(job.clientRequestId, job);
  }

  async deleteOutbox(clientRequestId: string) {
    this.outbox.delete(clientRequestId);
  }

  async rememberAlias(organizationId: string, localId: string, serverId: string) {
    this.aliases.set(this.invoiceKey(organizationId, localId), serverId);
  }

  async resolveAlias(organizationId: string, localId: string) {
    return this.aliases.get(this.invoiceKey(organizationId, localId)) ?? null;
  }
}
