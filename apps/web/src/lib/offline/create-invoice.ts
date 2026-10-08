import { isProvisionalInvoiceNumber, PROVISIONAL_INVOICE_NUMBER, type CreateInvoiceInput } from '@flowbooks/shared';
import { api, type Customer, type Invoice } from '@/lib/api';
import { calcInvoiceTotals } from '@/lib/line-items';
import { emitOfflineChange, requestSync } from '@/lib/offline/events';
import { isLikelyOfflineError, SyncOfflineError } from '@/lib/offline/network';
import { getOfflineStore } from '@/lib/offline/store';
import type { OfflineStorage, OutboxJob, StoredInvoice } from '@/lib/offline/types';

export interface CreateInvoiceResult extends Invoice {
  offlinePending?: boolean;
}

function newClientRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildPendingInvoice(input: {
  organizationId: string;
  clientRequestId: string;
  data: CreateInvoiceInput;
  customer?: Customer | null;
  preserveNumber: boolean;
}): Invoice {
  const { data, clientRequestId, organizationId, preserveNumber } = input;
  const lineItems = data.items.map((item) => ({
    name: item.name ?? '',
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxRate: item.taxRate ?? 0,
    productId: item.productId,
    imageUrl: item.imageUrl,
  }));
  const totals = calcInvoiceTotals(lineItems, data.discount ?? 0, data.shipping ?? 0, data.taxRate ?? 0);
  const now = new Date().toISOString();
  const showServerNumber = preserveNumber && data.number && !isProvisionalInvoiceNumber(data.number);

  return {
    id: clientRequestId,
    organizationId,
    customerId: data.customerId,
    number: showServerNumber ? data.number!.trim() : PROVISIONAL_INVOICE_NUMBER,
    status: 'DRAFT',
    issueDate: data.issueDate ? new Date(data.issueDate).toISOString() : now,
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    currency: data.currency || 'AED',
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    taxRate: totals.taxRate,
    shipping: totals.shipping,
    discount: data.discount ?? 0,
    total: totals.total,
    amountPaid: 0,
    shippingMethod: data.shippingMethod ?? null,
    shippingTerms: data.shippingTerms ?? null,
    shippingFromCountry: data.shippingFromCountry ?? null,
    shippingToCountry: data.shippingToCountry ?? null,
    notes: data.notes ?? null,
    createdAt: now,
    updatedAt: now,
    customer: input.customer ?? null,
    payments: [],
    clientRequestId,
    items: lineItems.map((item, index) => ({
      id: `${clientRequestId}-${index}`,
      productId: item.productId ?? null,
      name: item.name || null,
      description: item.description,
      imageUrl: item.imageUrl ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: 0,
      amount: item.quantity * item.unitPrice,
    })),
  };
}

export async function queueOfflineInvoice(
  store: OfflineStorage,
  input: {
    organizationId: string;
    data: CreateInvoiceInput;
    customer?: Customer | null;
    clientRequestId: string;
    preserveNumber: boolean;
  },
): Promise<Invoice> {
  const preserveNumber =
    input.preserveNumber && !!input.data.number && !isProvisionalInvoiceNumber(input.data.number);
  const invoice = buildPendingInvoice({ ...input, preserveNumber });
  const record: StoredInvoice = {
    organizationId: input.organizationId,
    localId: input.clientRequestId,
    clientRequestId: input.clientRequestId,
    syncState: 'pending',
    syncError: null,
    createdAt: Date.now(),
    invoice,
  };
  const job: OutboxJob = {
    clientRequestId: input.clientRequestId,
    organizationId: input.organizationId,
    localId: input.clientRequestId,
    createdAt: record.createdAt,
    attempts: 0,
    status: 'pending',
    lastError: null,
    preserveNumber,
    payload: {
      ...input.data,
      clientRequestId: input.clientRequestId,
      number: preserveNumber ? input.data.number : undefined,
    },
  };
  await store.putInvoice(record);
  await store.putOutbox(job);
  emitOfflineChange();
  return invoice;
}

/**
 * Online creates go to the API with a client key so a lost response can be retried.
 * Offline creates stay on the device until flushOutbox runs.
 */
export async function createInvoiceWithOfflineFallback(input: {
  token: string;
  organizationId: string;
  data: CreateInvoiceInput;
  customer?: Customer | null;
  store?: OfflineStorage;
  isOnline?: () => boolean;
  createInvoice?: (data: CreateInvoiceInput) => Promise<Invoice>;
  clientRequestId?: string;
}): Promise<CreateInvoiceResult> {
  const store = input.store ?? getOfflineStore();
  const isOnline = input.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine);
  const clientRequestId = input.clientRequestId ?? input.data.clientRequestId ?? newClientRequestId();
  const payload: CreateInvoiceInput = { ...input.data, clientRequestId };
  const createInvoice =
    input.createInvoice ??
    ((data: CreateInvoiceInput) => api.invoices.create(input.token, input.organizationId, data));

  if (!isOnline()) {
    const invoice = await queueOfflineInvoice(store, {
      organizationId: input.organizationId,
      data: payload,
      customer: input.customer,
      clientRequestId,
      preserveNumber: false,
    });
    return { ...invoice, offlinePending: true };
  }

  try {
    const created = await createInvoice(payload);
    await store
      .putInvoice({
        organizationId: input.organizationId,
        localId: created.id,
        clientRequestId,
        syncState: 'synced',
        syncError: null,
        createdAt: Date.now(),
        invoice: { ...created, clientRequestId: created.clientRequestId ?? clientRequestId },
      })
      .catch(() => undefined);
    return created;
  } catch (error) {
    if (!isLikelyOfflineError(error) && !(error instanceof SyncOfflineError)) throw error;
    const invoice = await queueOfflineInvoice(store, {
      organizationId: input.organizationId,
      data: payload,
      customer: input.customer,
      clientRequestId,
      preserveNumber: true,
    });
    requestSync();
    return { ...invoice, offlinePending: true };
  }
}
