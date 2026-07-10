import 'server-only';

/** Server PDF generation is disabled on Railway (no Chromium). Client builds PDFs from the on-screen invoice. */
export async function generatePrintPdf(): Promise<Buffer> {
  throw new Error('Server PDF is unavailable. Use Download or Share on the invoice page.');
}
