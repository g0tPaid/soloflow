import { describe, expect, it } from 'vitest';
import {
  OUTSTANDING_INVOICE_STATUSES,
  invoiceCountsTowardOutstanding,
  readStatusBeforeCancel,
  statusAfterOrderReopen,
} from './order-status';

describe('order cancel status', () => {
  it('keeps cancelled and void invoices out of outstanding totals', () => {
    expect(OUTSTANDING_INVOICE_STATUSES).toEqual(['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE']);
    expect(invoiceCountsTowardOutstanding('SENT')).toBe(true);
    expect(invoiceCountsTowardOutstanding('PARTIAL')).toBe(true);
    expect(invoiceCountsTowardOutstanding('CANCELLED')).toBe(false);
    expect(invoiceCountsTowardOutstanding('VOID')).toBe(false);
    expect(invoiceCountsTowardOutstanding('DRAFT')).toBe(false);
    expect(invoiceCountsTowardOutstanding('PAID')).toBe(false);
  });

  it('reads the status saved when the order was cancelled', () => {
    expect(readStatusBeforeCancel({ statusBeforeCancel: 'DRAFT' })).toBe('DRAFT');
    expect(readStatusBeforeCancel({})).toBeNull();
    expect(readStatusBeforeCancel(null)).toBeNull();
    expect(readStatusBeforeCancel([])).toBeNull();
  });

  it('restores the previous unpaid status, and payments when money was recorded', () => {
    expect(statusAfterOrderReopen({ total: 100, amountPaid: 0 }, 'DRAFT')).toBe('DRAFT');
    expect(statusAfterOrderReopen({ total: 100, amountPaid: 0 }, 'OVERDUE')).toBe('OVERDUE');
    expect(statusAfterOrderReopen({ total: 100, amountPaid: 0 }, null)).toBe('SENT');
    expect(statusAfterOrderReopen({ total: 100, amountPaid: 40 }, 'SENT')).toBe('PARTIAL');
    expect(statusAfterOrderReopen({ total: 100, amountPaid: 100 }, 'SENT')).toBe('PAID');
    expect(statusAfterOrderReopen({ total: 80, amountPaid: 0, status: 'CANCELLED' }, 'PAID')).toBe('PAID');
  });
});
