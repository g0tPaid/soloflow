import { type InvoicePdfVersion } from '@/lib/invoice-version';
export function buildServerPdfUrl(
  type: 'invoices' | 'receipts' | 'expenses' | 'quotes',
  id: string,
  options?: { organizationId?: string | null; filename?: string; version?: InvoicePdfVersion; quoteVersion?: number },
) {
  const params = new URLSearchParams();
  if (options?.organizationId) params.set('org', options.organizationId);
  if (options?.filename) params.set('filename', options.filename);
  if (type === 'invoices' && options?.version) params.set('version', String(options.version));
  if (type === 'quotes' && options?.quoteVersion) params.set('quoteVersion', String(options.quoteVersion));
  const query = params.toString();
  return `/api/pdf/print/${type}/${id}${query ? `?${query}` : ''}`;
}
