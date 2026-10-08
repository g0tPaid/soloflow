import { isProvisionalInvoiceNumber, type CreateInvoiceInput } from '@flowbooks/shared';
import type { Invoice } from '@/lib/api';
import { isLikelyOfflineError } from '@/lib/offline/network';
import type { OfflineStorage, OutboxJob, StoredInvoice } from '@/lib/offline/types';

export interface SyncClient {
  createInvoice: (data: CreateInvoiceInput) => Promise<Invoice>;
}

export interface FlushResult {
  synced: number;
  failed: number;
  stopped: 'offline' | null;
}

const flushLocks = new Map<string, Promise<FlushResult>>();

/** Drop provisional numbers so the server assigns the next real number. */
export function invoiceCreateBodyForSync(job: OutboxJob): CreateInvoiceInput {
  const payload: CreateInvoiceInput = { ...job.payload, clientRequestId: job.clientRequestId };
  if (!job.preserveNumber || isProvisionalInvoiceNumber(payload.number)) {
    const { number: _number, ...rest } = payload;
    return rest;
  }
  return payload;
}

async function commitSyncedInvoice(store: OfflineStorage, job: OutboxJob, invoice: Invoice) {
  const record: StoredInvoice = {
    organizationId: job.organizationId,
    localId: invoice.id,
    clientRequestId: job.clientRequestId,
    syncState: 'synced',
    syncError: null,
    createdAt: job.createdAt,
    invoice: { ...invoice, clientRequestId: invoice.clientRequestId ?? job.clientRequestId },
  };
  await store.deleteInvoice(job.organizationId, job.localId);
  await store.putInvoice(record);
  if (job.localId !== invoice.id) {
    await store.rememberAlias(job.organizationId, job.localId, invoice.id);
  }
  await store.deleteOutbox(job.clientRequestId);
}

async function flushOutboxUnlocked(
  store: OfflineStorage,
  organizationId: string,
  client: SyncClient,
  isOnline: () => boolean,
): Promise<FlushResult> {
  if (!isOnline()) return { synced: 0, failed: 0, stopped: 'offline' };

  const jobs = await store.listOutbox(organizationId);
  let synced = 0;
  let failed = 0;

  for (const job of jobs) {
    if (!isOnline()) return { synced, failed, stopped: 'offline' };
    try {
      const invoice = await client.createInvoice(invoiceCreateBodyForSync(job));
      await commitSyncedInvoice(store, job, invoice);
      synced += 1;
    } catch (error) {
      if (isLikelyOfflineError(error)) {
        return { synced, failed, stopped: 'offline' };
      }
      const message = error instanceof Error ? error.message : 'Could not sync invoice';
      await store.putOutbox({
        ...job,
        status: 'error',
        attempts: job.attempts + 1,
        lastError: message,
      });
      const local = await store.getInvoice(organizationId, job.localId);
      if (local) {
        await store.putInvoice({ ...local, syncState: 'error', syncError: message });
      }
      failed += 1;
    }
  }

  return { synced, failed, stopped: null };
}

/** Send queued invoice creates in createdAt order. Safe to call from several tabs. */
export function flushOutbox(
  store: OfflineStorage,
  organizationId: string,
  client: SyncClient,
  options?: { isOnline?: () => boolean },
): Promise<FlushResult> {
  const isOnline = options?.isOnline ?? (() => true);
  const previous = flushLocks.get(organizationId) ?? Promise.resolve({ synced: 0, failed: 0, stopped: null });
  const run = previous
    .catch((): FlushResult => ({ synced: 0, failed: 0, stopped: null }))
    .then(() => flushOutboxUnlocked(store, organizationId, client, isOnline));
  flushLocks.set(organizationId, run);
  return run.finally(() => {
    if (flushLocks.get(organizationId) === run) flushLocks.delete(organizationId);
  });
}
