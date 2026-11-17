export type InvoicePdfVersion = 2 | 3 | 4;

export const DROPSHIPPER_INVOICE_PATH = '/invoices-v4';
export const DROPSHIPPER_INVOICE_DRAFT_ID = '/dropshipper-invoices';
export const DROPSHIPPER_INVOICE_PDF_TITLE = 'Dropshipper Invoice';

export function usesBrandedInvoiceLayout(version?: InvoicePdfVersion) {
  return version === 3 || version === 4;
}

export function invoicePdfVersion(value: string | null): InvoicePdfVersion | undefined {
  if (value === '2') return 2;
  if (value === '3') return 3;
  if (value === '4') return 4;
}

export function invoiceVersionForPath(path: string): InvoicePdfVersion | undefined {
  if (isDropshipperInvoicePath(path)) return 4;
  const match = /^\/invoices-v([23])(?:\/|$)/.exec(path);
  return invoicePdfVersion(match?.[1] ?? null);
}

export function invoiceBasePath(version?: InvoicePdfVersion) {
  return version ? `/invoices-v${version}` : '/invoices';
}

export function isDropshipperInvoicePath(path: string) {
  return /^\/(?:invoices-v4|dropshipper-invoices)(?:\/|$)/.test(path);
}

export function invoicePathForRoute(path: string) {
  return invoiceBasePath(invoiceVersionForPath(path));
}
