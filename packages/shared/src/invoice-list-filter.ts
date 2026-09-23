import { FULFILLMENT_STATUS_VALUES, type FulfillmentStatus } from './constants';

/**
 * Coarse invoices-list guide. Payment chips use invoice payment status.
 * Delivery chips group the six fulfillment stages: still moving vs received/done.
 */
export const INVOICE_LIST_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'waiting_for_payment', label: 'Waiting for payment' },
  { id: 'paid', label: 'Paid' },
  { id: 'canceled', label: 'Canceled' },
  { id: 'on_the_way', label: 'On the way' },
  { id: 'order_complete', label: 'Order complete/received' },
] as const;

export type InvoiceListFilter = (typeof INVOICE_LIST_FILTERS)[number]['id'];

const WAITING_FOR_PAYMENT_STATUSES = ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] as const;
const PAID_STATUSES = ['PAID'] as const;
const CANCELED_STATUSES = ['CANCELLED', 'VOID'] as const;

/** Started, but the customer has not received the order yet. */
const ON_THE_WAY_STATUSES = [
  'LOCAL_ORDERING_COMPLETED',
  'QC_COMPLETED',
  'SHIPPED_TO_CHINA_CENTER',
  'SHIPPED_INTERNATIONAL',
] as const satisfies readonly FulfillmentStatus[];

const ORDER_COMPLETE_STATUSES = ['CUSTOMER_RECEIVED', 'ORDER_COMPLETED'] as const satisfies readonly FulfillmentStatus[];

export function isInvoiceListFilter(value: string): value is InvoiceListFilter {
  return INVOICE_LIST_FILTERS.some((filter) => filter.id === value);
}

export function invoiceListFilterCriteria(filter: InvoiceListFilter): {
  paymentStatuses?: readonly string[];
  fulfillmentStatuses?: readonly FulfillmentStatus[];
} {
  switch (filter) {
    case 'all':
      return {};
    case 'waiting_for_payment':
      return { paymentStatuses: WAITING_FOR_PAYMENT_STATUSES };
    case 'paid':
      return { paymentStatuses: PAID_STATUSES };
    case 'canceled':
      return { paymentStatuses: CANCELED_STATUSES };
    case 'on_the_way':
      return { fulfillmentStatuses: ON_THE_WAY_STATUSES };
    case 'order_complete':
      return { fulfillmentStatuses: ORDER_COMPLETE_STATUSES };
  }
}

export function invoiceMatchesListFilter(
  invoice: { status?: string | null; fulfillmentStatus?: string | null },
  filter: InvoiceListFilter,
): boolean {
  if (filter === 'all') return true;
  const criteria = invoiceListFilterCriteria(filter);
  if (criteria.paymentStatuses) return criteria.paymentStatuses.includes(invoice.status ?? '');
  if (criteria.fulfillmentStatuses) {
    return criteria.fulfillmentStatuses.includes((invoice.fulfillmentStatus ?? '') as FulfillmentStatus);
  }
  return false;
}

export function invoiceListFilterEmptyLabel(filter: InvoiceListFilter): string {
  const label = INVOICE_LIST_FILTERS.find((item) => item.id === filter)?.label ?? 'this status';
  return `No invoices in “${label}”.`;
}

/** Every fulfillment stage belongs to exactly one delivery chip. */
export function fulfillmentStageListFilter(status: FulfillmentStatus): InvoiceListFilter {
  const rank = FULFILLMENT_STATUS_VALUES.indexOf(status);
  return rank >= FULFILLMENT_STATUS_VALUES.indexOf('CUSTOMER_RECEIVED') ? 'order_complete' : 'on_the_way';
}
