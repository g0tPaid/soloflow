import { describe, expect, it } from 'vitest';
import { invoicePdfVersion, invoiceVersionForPath, invoiceBasePath } from './invoice-version';

describe('Invoice Version 6 routing', () => {
  it('recognizes Invoice 6 in URLs and PDF version requests', () => {
    expect(invoicePdfVersion('6')).toBe(6);
    expect(invoiceVersionForPath('/invoices-v6')).toBe(6);
    expect(invoiceVersionForPath('/invoices-v6/new')).toBe(6);
    expect(invoiceVersionForPath('/invoices-v6/invoice-id')).toBe(6);
    expect(invoiceBasePath(6)).toBe('/invoices-v6');
  });
  it('keeps Invoice 5 and the default invoice distinct', () => {
    expect(invoicePdfVersion('5')).toBe(5);
    expect(invoiceVersionForPath('/invoices-v5/invoice-id')).toBe(5);
    expect(invoiceVersionForPath('/invoices/invoice-id')).toBeUndefined();
  });
});
