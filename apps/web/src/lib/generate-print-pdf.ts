import { invoicePdfVersion } from '@/lib/invoice-version';
import 'server-only';

import sharp from 'sharp';
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
  const document = await loadPrintDocument(accessToken, type, id, organizationId);
  const version = invoicePdfVersion(new URL(request.url).searchParams.get('version'));
  if (version === 3 && document.type === 'invoices') {
    const org = await prepareTransparentSignature(document.org, (source) => transparentSignature(source, baseUrl));
    return renderToBuffer(buildPdfDocument({ ...document, org }, baseUrl, version));
  }
  return renderToBuffer(buildPdfDocument(document, baseUrl, version));
}
