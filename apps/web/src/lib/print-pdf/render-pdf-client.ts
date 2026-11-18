'use client';

import { type InvoicePdfVersion, usesBrandedInvoiceLayout } from '@/lib/invoice-version';
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
            let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
            for (let y = 0; y < canvas.height; y++) {
              for (let x = 0; x < canvas.width; x++) {
                const i = (y * canvas.width + x) * 4;
                const max = Math.max(data[i], data[i + 1], data[i + 2]);
                const min = Math.min(data[i], data[i + 1], data[i + 2]);
                const colored = data[i + 3] > 25 && max - min > 35 && max < 245;
                if (colored) {
                  left = Math.min(left, x);
                  right = Math.max(right, x);
                  top = Math.min(top, y);
                  bottom = Math.max(bottom, y);
                }
              }
            }
            if (right < left || bottom < top) throw new Error('Invoice button artwork missing');
            const crop = document.createElement('canvas');
            crop.width = right - left + 1;
            crop.height = bottom - top + 1;
            const cropContext = crop.getContext('2d');
            if (!cropContext) throw new Error('Cannot crop invoice button');
            cropContext.drawImage(canvas, left, top, crop.width, crop.height, 0, 0, crop.width, crop.height);
            cropContext.globalCompositeOperation = 'destination-in';
            cropContext.beginPath();
            cropContext.roundRect(0, 0, crop.width, crop.height, Math.round(crop.height * 0.21));
            cropContext.fill();
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
  const blob = await pdf(
    buildPdfDocument(
      { type: 'invoices', invoice: prepared.invoice, org: printOrg },
      origin,
      version,
      buttonImages,
    ),
  ).toBlob();
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  return new File([blob], safeName, { type: 'application/pdf' });
}
