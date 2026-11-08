import { draftLineFromInput, formDraftContent, type FormDraftContent } from '@/lib/form-draft/model';
import { parseStoredLineItem } from '@/lib/line-items';
import type { Invoice } from '@/lib/api';

/**
 * Fields copied into a new, unsaved invoice. The original invoice is not read
 * for payments, its issued number, the offline idempotency key, or fulfillment.
 */
export function draftContentFromInvoice(invoice: Invoice, today: string): FormDraftContent {
  const items = (invoice.items ?? []).map((item) => {
    const parsed = parseStoredLineItem(item);
    return draftLineFromInput({
      productId: item.productId,
      name: parsed.name,
      description: parsed.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      imageUrl: item.imageUrl ?? undefined,
    });
  });

  return formDraftContent({
    customerId: invoice.customerId ?? '',
    number: '',
    issueDate: today,
    dueDate: '',
    notes: invoice.notes ?? '',
    discount: Number(invoice.discount ?? 0),
    shipping: Number(invoice.shipping ?? 0),
    taxRate: Number(invoice.taxRate ?? 0),
    shippingMethod: invoice.shippingMethod ?? null,
    shippingTerms: invoice.shippingTerms ?? null,
    shippingFromCountry: invoice.shippingFromCountry ?? '',
    shippingToCountry: invoice.shippingToCountry ?? '',
    status: '',
    currency: invoice.currency || 'INR',
    currencyTouched: true,
    items: items.length > 0 ? items : undefined,
  });
}
