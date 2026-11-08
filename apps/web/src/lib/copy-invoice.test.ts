import { describe, expect, it } from 'vitest';
import { draftContentFromInvoice } from './copy-invoice';
import type { Invoice } from '@/lib/api';

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv_1',
    organizationId: 'org_1',
    customerId: 'cus_1',
    number: 'INV-00042',
    status: 'PAID',
    issueDate: '2026-01-01',
    dueDate: '2026-02-01',
    currency: 'AED',
    subtotal: 20,
    taxAmount: 1,
    taxRate: 5,
    shipping: 8,
    discount: 2,
    total: 27,
    amountPaid: 27,
    notes: 'Repeat the blue set',
    clientRequestId: 'offline-key',
    fulfillmentStatus: 'SHIPPED_INTERNATIONAL',
    localTrackingNumber: 'TRACK',
    shippingMethod: 'AIR',
    shippingTerms: 'DDP',
    shippingFromCountry: 'CN',
    shippingToCountry: 'AE',
    payments: [{ id: 'pay_1', invoiceId: 'inv_1', amount: 27, paidAt: '2026-01-02', method: 'CASH', createdAt: '2026-01-02' }],
    items: [
      {
        id: 'line_1',
        productId: 'prod_1',
        name: 'Blue set',
        description: 'Blue set',
        quantity: 2,
        unitPrice: 10,
        taxRate: 0,
        amount: 20,
      },
    ],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
    ...overrides,
  };
}

describe('draftContentFromInvoice', () => {
  it('copies lines, shipping, notes, currency, and tax without the issued invoice identity', () => {
    const draft = draftContentFromInvoice(invoice(), '2026-11-08');
    expect(draft.customerId).toBe('cus_1');
    expect(draft.notes).toBe('Repeat the blue set');
    expect(draft.shipping).toBe(8);
    expect(draft.discount).toBe(2);
    expect(draft.taxRate).toBe(5);
    expect(draft.currency).toBe('AED');
    expect(draft.shippingMethod).toBe('AIR');
    expect(draft.shippingFromCountry).toBe('CN');
    expect(draft.items[0]).toMatchObject({ productId: 'prod_1', quantity: 2, unitPrice: 10 });
    expect(draft.number).toBe('');
    expect(draft.status).toBe('');
    expect(draft.issueDate).toBe('2026-11-08');
    expect(JSON.stringify(draft)).not.toContain('INV-00042');
    expect(JSON.stringify(draft)).not.toContain('offline-key');
    expect(JSON.stringify(draft)).not.toContain('SHIPPED_INTERNATIONAL');
    expect(JSON.stringify(draft)).not.toContain('pay_1');
  });
});
