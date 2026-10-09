import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  invoiceMatchesListFilter,
  isInvoiceListFilter,
  readStatusBeforeCancel,
  statusAfterOrderReopen,
  type InvoiceListFilter,
} from '@flowbooks/shared';

export type OrderAction = 'cancel' | 'reopen';

type OrderInvoice = {
  id: string;
  status: string;
  total?: string | number | { toString(): string } | null;
  amountPaid?: string | number | { toString(): string } | null;
  fulfillmentStatus?: string | null;
  customFields?: unknown;
};

type InvoicePage<T> = {
  data: T[];
};

function fieldsOf(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

export function applyOrderAction<T extends OrderInvoice>(invoice: T, action: OrderAction): T {
  if (action === 'cancel') {
    if (invoice.status === 'CANCELLED' || invoice.status === 'VOID') return invoice;
    return {
      ...invoice,
      status: 'CANCELLED',
      customFields: { ...fieldsOf(invoice.customFields), statusBeforeCancel: invoice.status },
    };
  }
  if (invoice.status !== 'CANCELLED') return invoice;
  const customFields = fieldsOf(invoice.customFields);
  const previous = readStatusBeforeCancel(customFields);
  delete customFields.statusBeforeCancel;
  return {
    ...invoice,
    status: statusAfterOrderReopen(invoice, previous),
    customFields,
  };
}

export function applyOrderActionToScreen<T extends { invoice: OrderInvoice }>(
  screen: T | undefined,
  action: OrderAction,
): T | undefined {
  if (!screen) return screen;
  return { ...screen, invoice: applyOrderAction(screen.invoice, action) };
}

export function applyOrderActionToPage<T extends OrderInvoice>(
  page: InvoicePage<T> | undefined,
  invoiceId: string,
  action: OrderAction,
  filter?: InvoiceListFilter | null,
): InvoicePage<T> | undefined {
  if (!page || !Array.isArray(page.data)) return page;
  let data = page.data.map((invoice) =>
    invoice.id === invoiceId ? applyOrderAction(invoice, action) : invoice,
  );
  if (filter) data = data.filter((invoice) => invoiceMatchesListFilter(invoice, filter));
  return { ...page, data };
}

function filterFromQueryKey(key: QueryKey): InvoiceListFilter | null {
  const filter = key[2];
  if (typeof filter !== 'string' || !isInvoiceListFilter(filter) || filter === 'all') return null;
  return filter;
}

export function patchOrderActionCaches(
  queryClient: QueryClient,
  organizationId: string,
  invoiceId: string,
  action: OrderAction,
) {
  const detailKey = ['invoice', invoiceId, organizationId] as const;
  const previousDetail = queryClient.getQueryData(detailKey);
  queryClient.setQueryData(detailKey, (current) =>
    applyOrderActionToScreen(current as { invoice: OrderInvoice } | undefined, action),
  );

  const previousLists = queryClient.getQueriesData({ queryKey: ['invoices', organizationId] });
  for (const [key, data] of previousLists) {
    queryClient.setQueryData(
      key,
      applyOrderActionToPage(
        data as InvoicePage<OrderInvoice> | undefined,
        invoiceId,
        action,
        filterFromQueryKey(key),
      ),
    );
  }

  return { detailKey, previousDetail, previousLists };
}

export function restoreOrderActionCaches(
  queryClient: QueryClient,
  context: {
    detailKey: readonly unknown[];
    previousDetail: unknown;
    previousLists: Array<[QueryKey, unknown]>;
  },
) {
  queryClient.setQueryData(context.detailKey, context.previousDetail);
  for (const [key, snapshot] of context.previousLists) {
    queryClient.setQueryData(key, snapshot);
  }
}
