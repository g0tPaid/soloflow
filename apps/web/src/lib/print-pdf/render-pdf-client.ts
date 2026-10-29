'use client';

import { pdf } from '@react-pdf/renderer';
import type { Invoice, Organization } from '@/lib/api';
import { embedInvoiceImages } from '@/lib/print-pdf/embed-print-images';
import { buildPdfDocument } from '@/lib/print-pdf/pdf-documents';

/**
 * Same invoice document the server renders with @react-pdf/renderer.
 * Loaded only when Download PDF runs on the device.
 */
export async function renderInvoicePdfFile(
  invoice: Invoice,
  org: Organization,
  filename: string,
  baseUrl?: string,
): Promise<File> {
  const origin = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const prepared = await embedInvoiceImages(invoice, org, origin);
  const blob = await pdf(
    buildPdfDocument(
      { type: 'invoices', invoice: prepared.invoice, org: prepared.org },
      origin,
    ),
  ).toBlob();
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  return new File([blob], safeName, { type: 'application/pdf' });
}
