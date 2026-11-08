import { describe, expect, it } from 'vitest';
import { isVendorExpenseInvoice } from './sales-invoice';

describe('isVendorExpenseInvoice', () => {
  it('treats a vendor bill with no customer as an expense', () => {
    expect(isVendorExpenseInvoice({ vendorId: 'ven_1', customerId: null })).toBe(true);
    expect(isVendorExpenseInvoice({ vendorId: 'ven_1', customerId: '' })).toBe(true);
  });

  it('keeps customer invoices, including one that also names a vendor', () => {
    expect(isVendorExpenseInvoice({ vendorId: null, customerId: 'cus_1' })).toBe(false);
    expect(isVendorExpenseInvoice({ vendorId: 'ven_1', customerId: 'cus_1' })).toBe(false);
    expect(isVendorExpenseInvoice({ vendorId: null, customerId: null })).toBe(false);
  });
});
