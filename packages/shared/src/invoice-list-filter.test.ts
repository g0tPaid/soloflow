import { describe, expect, it } from 'vitest';
import { FULFILLMENT_STATUS_VALUES } from './constants';
import {
  INVOICE_LIST_FILTERS,
  fulfillmentStageListFilter,
  invoiceListFilterCriteria,
  invoiceMatchesListFilter,
} from './invoice-list-filter';

describe('invoice list filters', () => {
  it('shows the guide chips in the order from the invoices page', () => {
    expect(INVOICE_LIST_FILTERS.map((filter) => filter.label)).toEqual([
      'Waiting for payment',
      'Paid',
      'Canceled',
      'On the way',
      'Order complete/received',
    ]);
  });

  it('maps payment chips onto invoice payment status', () => {
    expect(invoiceMatchesListFilter({ status: 'SENT' }, 'waiting_for_payment')).toBe(true);
    expect(invoiceMatchesListFilter({ status: 'PARTIAL' }, 'waiting_for_payment')).toBe(true);
    expect(invoiceMatchesListFilter({ status: 'OVERDUE' }, 'waiting_for_payment')).toBe(true);
    expect(invoiceMatchesListFilter({ status: 'PAID' }, 'waiting_for_payment')).toBe(false);

    expect(invoiceMatchesListFilter({ status: 'PAID' }, 'paid')).toBe(true);
    expect(invoiceMatchesListFilter({ status: 'PARTIAL' }, 'paid')).toBe(false);

    expect(invoiceMatchesListFilter({ status: 'CANCELLED' }, 'canceled')).toBe(true);
    expect(invoiceMatchesListFilter({ status: 'VOID' }, 'canceled')).toBe(true);
    expect(invoiceMatchesListFilter({ status: 'PAID' }, 'canceled')).toBe(false);
  });

  it('groups fulfillment stages into on the way and received', () => {
    expect(invoiceListFilterCriteria('on_the_way').fulfillmentStatuses).toEqual([
      'LOCAL_ORDERING_COMPLETED',
      'QC_COMPLETED',
      'SHIPPED_TO_CHINA_CENTER',
      'SHIPPED_INTERNATIONAL',
    ]);
    expect(invoiceListFilterCriteria('order_complete').fulfillmentStatuses).toEqual([
      'CUSTOMER_RECEIVED',
      'ORDER_COMPLETED',
    ]);

    for (const status of FULFILLMENT_STATUS_VALUES) {
      const chip = fulfillmentStageListFilter(status);
      expect(invoiceMatchesListFilter({ fulfillmentStatus: status }, chip)).toBe(true);
      const other = chip === 'on_the_way' ? 'order_complete' : 'on_the_way';
      expect(invoiceMatchesListFilter({ fulfillmentStatus: status }, other)).toBe(false);
    }

    expect(invoiceMatchesListFilter({ fulfillmentStatus: null }, 'on_the_way')).toBe(false);
    expect(invoiceMatchesListFilter({ fulfillmentStatus: null }, 'order_complete')).toBe(false);
  });
});