import 'server-only';

import { api, type ExpenseDetail, type Invoice, type Organization } from '@/lib/api';
import { quoteAsInvoiceForPrint } from '@/lib/quote-print';

export type LoadedPrintDocument =
  | { type: 'invoices'; invoice: Invoice; org: Organization }
  | { type: 'receipts'; invoice: Invoice; org: Organization }
  | { type: 'expenses'; expense: ExpenseDetail }
  | { type: 'quotes'; invoice: Invoice; org: Organization };

export async function loadPrintDocument(
  accessToken: string,
  type: string,
  id: string,
  organizationId?: string | null,
): Promise<LoadedPrintDocument> {
  if (!organizationId) {
    throw new Error('Organization is required to generate this PDF.');
  }

  switch (type) {
    case 'invoices':
    case 'receipts': {
      const [invoice, org] = await Promise.all([
        api.invoices.get(accessToken, organizationId, id),
        api.organizations.get(accessToken, organizationId),
      ]);
      return type === 'invoices'
        ? { type: 'invoices', invoice, org }
        : { type: 'receipts', invoice, org };
    }
    case 'quotes': {
      const [quote, org] = await Promise.all([
        api.quotes.get(accessToken, organizationId, id),
        api.organizations.get(accessToken, organizationId),
      ]);
      return { type: 'quotes', invoice: quoteAsInvoiceForPrint(quote), org };
    }
    case 'expenses': {
      const expense = await api.expenses.get(accessToken, organizationId, id);
      return { type: 'expenses', expense };
    }
    default:
      throw new Error('Unsupported document type');
  }
}
