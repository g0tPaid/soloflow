import { invoicePdfVersion, usesBrandedInvoiceLayout } from '@/lib/invoice-version';
import 'server-only';

import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareTransparentSignature, removeWhiteSignaturePixels } from '@/lib/print-pdf/transparent-signature';
import { renderToBuffer } from '@react-pdf/renderer';
import { loadPrintDocument } from '@/lib/print-pdf/load-print-data';
import { buildPdfDocument } from '@/lib/print-pdf/pdf-documents';

function resolveBaseUrl(request: Request) {
  const configured = process.env.NEXTAUTH_URL?.replace(/\/$/, '');
  if (configured) return configured;
  return new URL(request.url).origin;
}

async function transparentSignature(source: string, baseUrl: string) {
  const dataUrl = /^data:image\/(?:png|jpe?g);base64,([a-z0-9+/=]+)$/i.exec(source);
  let bytes: Buffer;
  if (dataUrl) {
    bytes = Buffer.from(dataUrl[1], 'base64');
  } else {
    const url = new URL(source, baseUrl);
    if (url.origin !== new URL(baseUrl).origin || !url.pathname.startsWith('/uploads/')) return;
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!response.ok) return;
    bytes = Buffer.from(await response.arrayBuffer());
  }

  const { data, info } = await sharp(bytes, { limitInputPixels: 16_000_000 })
    .rotate()
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  removeWhiteSignaturePixels(data);
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

export async function generatePrintPdf(
  request: Request,
  accessToken: string,
  type: string,
  id: string,
  organizationId?: string | null,
): Promise<Buffer> {
  const baseUrl = resolveBaseUrl(request);
  const searchParams = new URL(request.url).searchParams;
  const requestedQuoteVersion = type === 'quotes' ? searchParams.get('quoteVersion') : null;
  const quoteVersion = requestedQuoteVersion === null ? undefined : Number(requestedQuoteVersion);
  const document = await loadPrintDocument(accessToken, type, id, organizationId, quoteVersion);
  const version = invoicePdfVersion(searchParams.get('version'));
  if (version === 5 && document.type === 'invoices') {
    const asset = async (filename: string) => {
      const bytes = await readFile(path.join(process.cwd(), 'public', filename));
      const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let left = info.width, right = -1, top = info.height, bottom = -1;
      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const i = (y * info.width + x) * 4;
          const max = Math.max(data[i], data[i + 1], data[i + 2]);
          const min = Math.min(data[i], data[i + 1], data[i + 2]);
          if (max - min > 35 && max < 245 && data[i + 3] > 25) {
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
      }
      if (right < left || bottom < top) throw new Error('Button artwork not found');
      const width = right - left + 1, height = bottom - top + 1;
      const radius = Math.round(height * 0.21);
      const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="white"/></svg>`);
      const cropped = await sharp(bytes).extract({ left, top, width, height })
        .ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
      return `data:image/png;base64,${cropped.toString('base64')}`;
    };
    const [wise, download] = await Promise.all([
      asset('Pay with Wise Button.png'),
      asset('Sourcing Center Download Invoice Button.png'),
    ]);
    return renderToBuffer(buildPdfDocument(document, baseUrl, version, { wise, download }));
  }
  if (usesBrandedInvoiceLayout(version) && document.type === 'invoices') {
    const org = await prepareTransparentSignature(document.org, (source) => transparentSignature(source, baseUrl));
    return renderToBuffer(buildPdfDocument({ ...document, org }, baseUrl, version));
  }
  return renderToBuffer(buildPdfDocument(document, baseUrl, version));
}
