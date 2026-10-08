import { describe, expect, it } from 'vitest';
import { isProvisionalInvoiceNumber, PROVISIONAL_INVOICE_NUMBER } from './offline-invoice';

describe('provisional invoice numbers', () => {
  it('treats the on-device pending label as provisional', () => {
    expect(isProvisionalInvoiceNumber(PROVISIONAL_INVOICE_NUMBER)).toBe(true);
    expect(isProvisionalInvoiceNumber(' pending ')).toBe(true);
    expect(isProvisionalInvoiceNumber('OFFLINE')).toBe(true);
  });

  it('leaves real invoice numbers alone', () => {
    expect(isProvisionalInvoiceNumber('INV-00042')).toBe(false);
    expect(isProvisionalInvoiceNumber(undefined)).toBe(false);
    expect(isProvisionalInvoiceNumber('')).toBe(false);
  });
});
