import { roundMoney } from './fx';

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE', label: 'Mobile money' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

const PAID_EPS = 0.005;

export function toMoneyNumber(
  value: string | number | { toString(): string } | null | undefined,
): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value.toString());
  return Number.isFinite(n) ? roundMoney(n) : 0;
}

export function isVoidedPayment(payment: { voidedAt?: string | Date | null }): boolean {
  return payment.voidedAt != null && payment.voidedAt !== '';
}

export function activePayments<T extends { voidedAt?: string | Date | null }>(
  payments: T[] | null | undefined,
): T[] {
  return (payments ?? []).filter((payment) => !isVoidedPayment(payment));
}

export function sumActivePaymentAmounts(
  payments: Array<{ amount?: string | number | { toString(): string } | null; voidedAt?: string | Date | null }> | null | undefined,
): number {
  return toMoneyNumber(
    activePayments(payments).reduce((sum, payment) => sum + toMoneyNumber(payment.amount), 0),
  );
}

export function invoiceAmountPaid(invoice: {
  amountPaid?: string | number | { toString(): string } | null;
  status?: string;
  total?: string | number | { toString(): string } | null;
  payments?: Array<{ amount?: string | number | { toString(): string } | null; voidedAt?: string | Date | null }> | null;
}): number {
  if (Array.isArray(invoice.payments) && invoice.payments.length > 0) {
    return sumActivePaymentAmounts(invoice.payments);
  }
  if (invoice.amountPaid != null && invoice.amountPaid !== '') {
    return toMoneyNumber(invoice.amountPaid);
  }
  if (invoice.status === 'PAID') return toMoneyNumber(invoice.total);
  return 0;
}

export function invoiceBalanceDue(invoice: {
  total?: string | number | { toString(): string } | null;
  amountPaid?: string | number | { toString(): string } | null;
  status?: string;
}): number {
  return roundMoney(Math.max(0, toMoneyNumber(invoice.total) - invoiceAmountPaid(invoice)));
}

export function isInvoiceFullyPaid(invoice: {
  total?: string | number | { toString(): string } | null;
  amountPaid?: string | number | { toString(): string } | null;
  status?: string;
}): boolean {
  return invoiceBalanceDue(invoice) <= PAID_EPS;
}

export function isReceiptEligible(invoice: {
  status?: string;
  amountPaid?: string | number | { toString(): string } | null;
  total?: string | number | { toString(): string } | null;
}): boolean {
  if (invoice.status === 'VOID' || invoice.status === 'CANCELLED') return false;
  if (invoice.status === 'PAID') return true;
  return invoiceAmountPaid(invoice) > PAID_EPS;
}

export function statusAfterPayment(total: number, amountPaid: number): 'PARTIAL' | 'PAID' {
  if (toMoneyNumber(amountPaid) + PAID_EPS >= toMoneyNumber(total)) return 'PAID';
  return 'PARTIAL';
}

export function paymentMethodLabel(method?: string | null): string {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method ?? 'Payment';
}
