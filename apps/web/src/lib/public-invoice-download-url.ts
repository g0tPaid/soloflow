/**
 * Customer-facing download links must always use SoloFlow's public HTTPS host.
 * The server's internal request origin and NEXTAUTH_URL may be localhost inside
 * Railway; neither should ever be embedded in a PDF sent to a customer.
 */
export const PUBLIC_SOLOFLOW_ORIGIN = 'https://soloflow.practicalthings.store';

export function publicInvoiceDownloadUrl(token: string): string {
  if (!token || !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(token)) {
    throw new Error('Invalid invoice download token');
  }
  return `${PUBLIC_SOLOFLOW_ORIGIN}/api/pdf/public-invoice/${encodeURIComponent(token)}`;
}

export function isPublicInvoiceDownloadUrl(url: string): boolean {
  return url.startsWith(`${PUBLIC_SOLOFLOW_ORIGIN}/api/pdf/public-invoice/`);
}
