import { invoiceAmountPaid, invoiceBalanceDue, isDropshippingPartnerInvoice } from '@flowbooks/shared';
import type { Invoice, Organization } from '@/lib/api';
import { parseStoredLineItem } from '@/lib/line-items';
import { formatAddressLines, parseBranding } from '@/lib/organization-branding';
import { getInvoiceShipTo } from './invoice-ship-to';
import { formatCurrency } from '@/lib/utils';

export function getMobileInvoiceData(invoice: Invoice, organization?: Organization | null, repMarkets = false) {
  const money = (amount: string | number) => formatCurrency(Number(amount), invoice.currency);
  const branding = parseBranding(organization?.settings?.branding);
  const paid = invoiceAmountPaid(invoice);
  const tax = Number(invoice.taxAmount ?? 0);
  const cancelled = invoice.status === 'CANCELLED' || invoice.status === 'VOID';
  const date = new Date(invoice.issueDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });

  const shipTo = getInvoiceShipTo(invoice);
  const dropshipOrder = !repMarkets && (isDropshippingPartnerInvoice(invoice) || invoice.customer?.isDropshipper) ? {
    name: shipTo?.name,
    address: shipTo?.address ?? [],
    orderNumber: invoice.partnerOrderNumber?.trim(),
    phone: invoice.shipmentContact?.phone?.trim(),
    carrier: invoice.shipmentCarrier?.trim(),
    weight: invoice.shipmentWeightKg != null && Number(invoice.shipmentWeightKg) > 0 ? `${invoice.shipmentWeightKg} kg` : undefined,
    tracking: invoice.internationalTrackingNumber?.trim(),
    method: invoice.shippingMethod === 'AIR' ? 'Air' : invoice.shippingMethod === 'SEA' ? 'Sea' : invoice.shippingMethod === 'LOCAL' ? 'Local delivery' : undefined,
  } : null;

  return {
    date,
    organizationName: repMarkets ? '' : organization?.name ?? 'Your Company',
    address: repMarkets ? 'Putian, Xiamen, CHINA' : formatAddressLines(branding.address).join(' · '),
    customerAddress: formatAddressLines(invoice.customer?.address ?? undefined),
    shipTo,
    dropshipOrder,
    contact: repMarkets ? branding.phone : [branding.phone, branding.email].filter(Boolean).join(' · '),
    taxId: repMarkets ? undefined : branding.trn,
    website: repMarkets ? 'www.rep.markets' : branding.website,
    status: cancelled ? invoice.status : undefined,
    balance: money(cancelled ? 0 : invoiceBalanceDue(invoice)),
    items: (invoice.items ?? []).map((item) => {
      const { name, description } = parseStoredLineItem(item);
      const title = name || description || 'Item';
      return {
        id: item.id,
        title,
        description: description !== title ? description : undefined,
        image: item.imageUrl || item.product?.imageUrl,
        quantity: `${Number(item.quantity)} × ${money(item.unitPrice)}`,
        amount: money(item.amount),
      };
    }),
    totals: [
      { label: 'Subtotal', amount: money(invoice.subtotal) },
      ...(Number(invoice.discount) > 0 ? [{ label: 'Discount', amount: money(-Number(invoice.discount)) }] : []),
      ...(Number(invoice.shipping) > 0 ? [{ label: 'Delivery', amount: money(invoice.shipping) }] : []),
      ...(tax > 0 ? [{ label: 'VAT', amount: money(tax) }] : []),
      ...(paid > 0 ? [{ label: 'Invoice total', amount: money(invoice.total) }, { label: 'Amount paid', amount: money(paid) }] : []),
    ],
  };
}
