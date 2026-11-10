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
