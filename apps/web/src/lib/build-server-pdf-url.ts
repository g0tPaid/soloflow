export function buildServerPdfUrl(
  type: 'invoices' | 'receipts' | 'expenses',
  id: string,
  options?: { organizationId?: string | null; filename?: string },
) {
  const params = new URLSearchParams();
  if (options?.organizationId) params.set('org', options.organizationId);
  if (options?.filename) params.set('filename', options.filename);
  const query = params.toString();
  return `/api/pdf/print/${type}/${id}${query ? `?${query}` : ''}`;
}
