'use client';

import { type InvoicePdfVersion } from '@/lib/invoice-version';
import { pdf } from '@react-pdf/renderer';
import type { Invoice, Organization } from '@/lib/api';
import { embedInvoiceImages } from '@/lib/print-pdf/embed-print-images';
import { prepareTransparentSignature, removeWhiteSignaturePixels } from '@/lib/print-pdf/transparent-signature';
import { buildPdfDocument } from '@/lib/print-pdf/pdf-documents';

async function transparentSignature(source: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  removeWhiteSignaturePixels(pixels.data);
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Same invoice document the server renders with @react-pdf/renderer.
 * Loaded only when Download PDF runs on the device.
 */
export async function renderInvoicePdfFile(
  invoice: Invoice,
  org: Organization,
  filename: string,
  baseUrl?: string,
  version?: InvoicePdfVersion,
): Promise<File> {
  const origin = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const prepared = await embedInvoiceImages(invoice, org, origin);
  const printOrg = version === 3
    ? await prepareTransparentSignature(prepared.org, transparentSignature)
    : prepared.org;
  const blob = await pdf(
    buildPdfDocument(
      { type: 'invoices', invoice: prepared.invoice, org: printOrg },
      origin,
      version,
    ),
  ).toBlob();
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  return new File([blob], safeName, { type: 'application/pdf' });
}
