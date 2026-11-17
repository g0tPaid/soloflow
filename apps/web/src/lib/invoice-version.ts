export type InvoicePdfVersion = 2 | 3;

export function invoicePdfVersion(value: string | null): InvoicePdfVersion | undefined {
  if (value === '2') return 2;
  if (value === '3') return 3;
}

export function invoiceVersionForPath(path: string): InvoicePdfVersion | undefined {
  const match = /^\/invoices-v([23])(?:\/|$)/.exec(path);
  return invoicePdfVersion(match?.[1] ?? null);
}

export function invoiceBasePath(version?: InvoicePdfVersion) {
  return version ? `/invoices-v${version}` : '/invoices';
}

export const DROPSHIPPER_INVOICE_PATH = '/dropshipper-invoices';

export function isDropshipperInvoicePath(path: string) {
  return path === DROPSHIPPER_INVOICE_PATH || path.startsWith(`${DROPSHIPPER_INVOICE_PATH}/`);
}

export function invoicePathForRoute(path: string) {
  return isDropshipperInvoicePath(path) ? DROPSHIPPER_INVOICE_PATH : invoiceBasePath(invoiceVersionForPath(path));
}
