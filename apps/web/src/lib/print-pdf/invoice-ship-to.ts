import { isDropshippingPartnerInvoice } from '@flowbooks/shared';
import type { Invoice } from '@/lib/api';

export function getInvoiceShipTo(invoice: Invoice) {
  if (!isDropshippingPartnerInvoice(invoice) && !invoice.customer?.isDropshipper) return null;

  const contact = invoice.shipmentContact;
  const name = invoice.endRecipientName?.trim();
  const locality = [contact?.city?.trim(), contact?.region?.trim(), contact?.postcode?.trim()]
    .filter(Boolean).join(', ');
  const address = [invoice.endRecipientAddress?.trim(), contact?.addressLine2?.trim(), locality]
    .filter((line): line is string => Boolean(line));
  if (!name && !address.length && !contact?.country?.trim()) return null;

  const country = contact?.country?.trim() || invoice.shippingToCountry?.trim();
  if (country) address.push(country);
  return { name, address };
}
