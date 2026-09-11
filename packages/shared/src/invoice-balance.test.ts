import { describe, expect, it } from 'vitest';
import {
  invoiceAmountPaid,
  invoiceBalanceDue,
  isReceiptEligible,
  paymentMethodLabel,
  statusAfterPayment,
} from './invoice-balance';

describe('invoice balance', () => {
  it('treats a half payment as partial with remaining due', () => {
    const invoice = { total: 1000, amountPaid: 400, status: 'PARTIAL' };
    expect(invoiceAmountPaid(invoice)).toBe(400);
    expect(invoiceBalanceDue(invoice)).toBe(600);
    expect(statusAfterPayment(1000, 400)).toBe('PARTIAL');
    expect(isReceiptEligible(invoice)).toBe(true);
  });

  it('marks an invoice paid when recorded payments cover the total', () => {
    expect(statusAfterPayment(250, 250)).toBe('PAID');
    expect(invoiceBalanceDue({ total: 250, amountPaid: 250, status: 'PAID' })).toBe(0);
    expect(isReceiptEligible({ total: 250, amountPaid: 250, status: 'PAID' })).toBe(true);
  });

  it('falls back to the invoice total for legacy paid invoices without amountPaid', () => {
    expect(invoiceAmountPaid({ total: 80, status: 'PAID' })).toBe(80);
    expect(invoiceBalanceDue({ total: 80, status: 'PAID' })).toBe(0);
  });

  it('hides receipts for unpaid or void invoices', () => {
    expect(isReceiptEligible({ total: 100, amountPaid: 0, status: 'SENT' })).toBe(false);
    expect(isReceiptEligible({ total: 100, amountPaid: 40, status: 'VOID' })).toBe(false);
  });

  it('labels payment methods for receipts', () => {
    expect(paymentMethodLabel('BANK')).toBe('Bank transfer');
    expect(paymentMethodLabel('CASH')).toBe('Cash');
  });
});
