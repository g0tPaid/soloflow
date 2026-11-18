'use client';

import { type InvoicePdfVersion, usesBrandedInvoiceLayout } from '@/lib/invoice-version';
import { pdf } from '@react-pdf/renderer';
import type { Invoice, Organization } from '@/lib/api';
import { embedInvoiceImages } from '@/lib/print-pdf/embed-print-images';
import { prepareTransparentSignature, removeWhiteSignaturePixels } from '@/lib/print-pdf/transparent-signature';
import { buildPdfDocument } from '@/lib/print-pdf/pdf-documents';
import { isolateInvoiceButton } from '@/lib/print-pdf/isolate-invoice-button';

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
  const printOrg = usesBrandedInvoiceLayout(version)
    ? await prepareTransparentSignature(prepared.org, transparentSignature)
    : prepared.org;
  const buttonImages = version === 5
    ? await (async () => {
        const asset = async (filename: string) => {
          const response = await fetch(`${origin}/${encodeURIComponent(filename)}`);
          if (!response.ok) throw new Error(`Unable to load invoice button: ${filename}`);
          const blob = await response.blob();
          const bitmap = await createImageBitmap(blob);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Cannot prepare invoice button image');
            context.drawImage(bitmap, 0, 0);
            const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
            const clean = isolateInvoiceButton(data, canvas.width, canvas.height);
            const crop = document.createElement('canvas');
            crop.width = clean.width;
            crop.height = clean.height;
            const cropContext = crop.getContext('2d');
            if (!cropContext) throw new Error('Cannot prepare invoice button image');
            cropContext.putImageData(
              new ImageData(new Uint8ClampedArray(clean.pixels), clean.width, clean.height),
              0,
              0,
            );
            return crop.toDataURL('image/png');
          } finally {
            bitmap.close();
          }
        };
        const [wise, download] = await Promise.all([
          asset('Pay with Wise Button.png'),
          asset('Sourcing Center Download Invoice Button.png'),
        ]);
        return { wise, download };
      })()
    : undefined;
  let downloadUrl: string | undefined;
  if (version === 5 && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const response = await fetch(
        `/api/pdf/public-invoice-token/${encodeURIComponent(invoice.id)}?org=${encodeURIComponent(org.id)}`,
        { credentials: 'include', cache: 'no-store' },
      );
      if (response.ok) {
        const result = await response.json() as { url?: string };
        if (result.url?.startsWith(window.location.origin + '/api/pdf/public-invoice/')) {
          downloadUrl = result.url;
        }
      }
    } catch {
      // Offline documents can still be saved, but cannot mint a server link.
    }
  }
  const blob = await pdf(
    buildPdfDocument(
      { type: 'invoices', invoice: prepared.invoice, org: printOrg },
      origin,
      version,
      buttonImages,
      downloadUrl,
    ),
  ).toBlob();
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  return new File([blob], safeName, { type: 'application/pdf' });
}
