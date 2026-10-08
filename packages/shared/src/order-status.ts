import { invoiceAmountPaid, statusAfterPayment, toMoneyNumber } from './invoice-balance';

/** Unpaid invoices that still count on the dashboard outstanding total. */
export const OUTSTANDING_INVOICE_STATUSES = ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] as const;

export type OutstandingInvoiceStatus = (typeof OUTSTANDING_INVOICE_STATUSES)[number];

const RESTORABLE_UNPAID_STATUSES = ['DRAFT', 'SENT', 'VIEWED', 'OVERDUE'] as const;

export type ReopenedInvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'OVERDUE' | 'PARTIAL' | 'PAID';

export function invoiceCountsTowardOutstanding(status?: string | null): boolean {
  return (OUTSTANDING_INVOICE_STATUSES as readonly string[]).includes(status ?? '');
}

export function readStatusBeforeCancel(customFields: unknown): string | null {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return null;
  const value = (customFields as { statusBeforeCancel?: unknown }).statusBeforeCancel;
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Reopen a cancelled order. Recorded payments win over the saved status.
 * Otherwise restore the status from before cancel, or Sent when that is unknown.
 */
export function statusAfterOrderReopen(
  invoice: {
    total?: string | number | { toString(): string } | null;
    amountPaid?: string | number | { toString(): string } | null;
    status?: string;
  },
  previousStatus?: string | null,
): ReopenedInvoiceStatus {
  const paid = invoiceAmountPaid(invoice);
  if (paid > 0.005) {
    return statusAfterPayment(toMoneyNumber(invoice.total), paid);
  }
  if (previousStatus === 'PAID') return 'PAID';
  if (
    previousStatus &&
    (RESTORABLE_UNPAID_STATUSES as readonly string[]).includes(previousStatus)
  ) {
    return previousStatus as ReopenedInvoiceStatus;
  }
  return 'SENT';
}
