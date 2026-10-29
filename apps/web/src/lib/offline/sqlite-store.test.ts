import { describe, expect, it } from 'vitest';
import type { Customer, Organization, Product } from '@/lib/api';
import type { DocumentDb, DocumentRow } from '@/lib/offline/document-db';
import { SqliteOfflineStorage } from '@/lib/offline/sqlite-store';
import type { OutboxJob, StoredInvoice } from '@/lib/offline/types';

class MemoryDocumentDb implements DocumentDb {
  private rows = new Map<string, DocumentRow>();

  private id(bucket: string, key: string) {
    return `${bucket}\0${key}`;
  }

  async get(bucket: string, key: string) {
    return this.rows.get(this.id(bucket, key)) ?? null;
  }

  async put(bucket: string, row: DocumentRow) {
    this.rows.set(this.id(bucket, keyOf(row)), { ...row });
  }

  async delete(bucket: string, key: string) {
    this.rows.delete(this.id(bucket, key));
  }

  async listByOrganization(bucket: string, organizationId: string) {
    return [...this.rows.entries()]
      .filter(([id, row]) => id.startsWith(`${bucket}\0`) && row.organizationId === organizationId)
      .map(([, row]) => ({ ...row }));
  }

  async deleteByOrganization(bucket: string, organizationId: string) {
    for (const [id, row] of this.rows) {
      if (id.startsWith(`${bucket}\0`) && row.organizationId === organizationId) this.rows.delete(id);
    }
  }
}

function keyOf(row: DocumentRow) {
  return row.key;
}

function store() {
  return new SqliteOfflineStorage(async () => new MemoryDocumentDb());
}

function stored(localId: string, organizationId = 'org_1'): StoredInvoice {
  return {
    organizationId,
    localId,
    clientRequestId: localId,
    syncState: 'pending',
    syncError: null,
    createdAt: localId === 'later' ? 20 : 10,
    invoice: {
      id: localId,
      organizationId,
      number: 'Pending',
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
    },
  };
}

describe('SqliteOfflineStorage', () => {
  it('keeps customers, products, and the organization on device', async () => {
    const offline = store();
    const customers = [{ id: 'cus_1', name: 'Ada' }] as Customer[];
    const products = [{ id: 'prd_1', name: 'Widget', unitPrice: 10, taxRate: 0, currency: 'AED' }] as Product[];
    const organization = { id: 'org_1', name: 'Practical Things' } as Organization;

    await offline.writeCustomers('org_1', customers);
    await offline.writeProducts('org_1', products);
    await offline.writeOrganization(organization);

    expect(await offline.readCustomers('org_1')).toEqual(customers);
    expect(await offline.readProducts('org_2')).toEqual([]);
    expect(await offline.readProducts('org_1')).toEqual(products);
    expect(await offline.readOrganization('org_1')).toEqual(organization);
    expect(await offline.readOrganization('missing')).toBeNull();
  });

  it('replaces one organization invoices and leaves another alone', async () => {
    const offline = store();
    await offline.putInvoice(stored('old'));
    await offline.putInvoice(stored('other', 'org_2'));

    await offline.replaceInvoices('org_1', [stored('fresh')]);

    expect((await offline.listInvoices('org_1')).map((row) => row.localId)).toEqual(['fresh']);
    expect(await offline.getInvoice('org_1', 'old')).toBeNull();
    expect((await offline.listInvoices('org_2')).map((row) => row.localId)).toEqual(['other']);

    await offline.deleteInvoice('org_2', 'other');
    expect(await offline.listInvoices('org_2')).toEqual([]);
  });

  it('queues outbox jobs in created order and remembers server aliases', async () => {
    const offline = store();
    const later: OutboxJob = {
      clientRequestId: 'later',
      organizationId: 'org_1',
      localId: 'later',
      createdAt: 20,
      attempts: 0,
      status: 'pending',
      lastError: null,
      preserveNumber: false,
      payload: { customerId: 'cus_1', currency: 'AED', items: [] },
    };
    const earlier: OutboxJob = { ...later, clientRequestId: 'earlier', localId: 'earlier', createdAt: 5 };

    await offline.putOutbox(later);
    await offline.putOutbox(earlier);
    expect((await offline.listOutbox('org_1')).map((job) => job.clientRequestId)).toEqual(['earlier', 'later']);

    await offline.deleteOutbox('earlier');
    expect((await offline.listOutbox('org_1')).map((job) => job.clientRequestId)).toEqual(['later']);

    await offline.rememberAlias('org_1', 'later', 'inv_server');
    expect(await offline.resolveAlias('org_1', 'later')).toBe('inv_server');
    expect(await offline.resolveAlias('org_1', 'missing')).toBeNull();
  });
});
