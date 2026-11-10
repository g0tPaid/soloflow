export function buildServerPdfUrl(
  type: 'invoices' | 'receipts' | 'expenses' | 'quotes',
  id: string,
  options?: { organizationId?: string | null; filename?: string; version?: 2 },
) {
  const params = new URLSearchParams();
  if (options?.organizationId) params.set('org', options.organizationId);
  if (options?.filename) params.set('filename', options.filename);
  if (type === 'invoices' && options?.version === 2) params.set('version', '2');
  const query = params.toString();
  return `/api/pdf/print/${type}/${id}${query ? `?${query}` : ''}`;
}
