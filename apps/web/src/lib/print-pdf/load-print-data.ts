import 'server-only';

import { api } from '@/lib/api';
import { quoteAsInvoiceForPrint } from '@/lib/quote-print';
import type { LoadedPrintDocument } from '@/lib/print-pdf/document-types';

export type { LoadedPrintDocument } from '@/lib/print-pdf/document-types';

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
