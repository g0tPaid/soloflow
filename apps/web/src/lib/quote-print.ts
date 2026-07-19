import type { Invoice, Quote } from '@/lib/api';

/** Map a quote into the invoice shape used by shared print/PDF views. */
export function quoteAsInvoiceForPrint(quote: Quote): Invoice {
  return {
    id: quote.id,
    organizationId: quote.organizationId,
    customerId: quote.customerId,
    number: quote.number,
    status: 'DRAFT',
    issueDate: quote.issueDate,
    dueDate: quote.validUntil,
    currency: quote.currency,
    subtotal: quote.subtotal,
    taxAmount: quote.taxAmount,
    taxRate: quote.taxRate,
    shipping: quote.shipping,
    discount: quote.discount,
    total: quote.total,
    shippingMethod: quote.shippingMethod,
    shippingTerms: quote.shippingTerms,
    shippingFromCountry: quote.shippingFromCountry,
    shippingToCountry: quote.shippingToCountry,
    notes: quote.notes,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
    customer: quote.customer,
    items: quote.items?.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      amount: item.amount,
      product: item.product,
    })),
  };
}
