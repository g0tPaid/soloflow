import { invoicePdfVersion, usesBrandedInvoiceLayout } from '@/lib/invoice-version';
import 'server-only';

import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareTransparentSignature, removeWhiteSignaturePixels } from '@/lib/print-pdf/transparent-signature';
import { renderToBuffer } from '@react-pdf/renderer';
import { loadPrintDocument } from '@/lib/print-pdf/load-print-data';
import { buildPdfDocument } from '@/lib/print-pdf/pdf-documents';
import { isolateInvoiceButton } from '@/lib/print-pdf/isolate-invoice-button';
import { widenV5Button } from '@/lib/print-pdf/widen-v5-buttons';
import { recolorV6Button } from '@/lib/print-pdf/v6-button-art';
import { apiFetch } from '@/lib/api';
import { publicInvoiceDownloadUrl } from '@/lib/public-invoice-download-url';

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
  if ((version === 5 || version === 6) && document.type === 'invoices') {
    const asset = async (filename: string, kind: 'wise' | 'download') => {
      const bytes = await readFile(path.join(process.cwd(), 'public', filename));
      const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const clean = isolateInvoiceButton(data, info.width, info.height);
      const art = version === 5
        ? widenV5Button(clean.pixels, clean.width, clean.height, kind)
        : { pixels: recolorV6Button(clean.pixels, kind), width: clean.width, height: clean.height };
      const cropped = await sharp(art.pixels, {
        raw: { width: art.width, height: art.height, channels: 4 },
      }).png().toBuffer();
      return `data:image/png;base64,${cropped.toString('base64')}`;
    };
    const [wise, download] = await Promise.all([
      asset('Pay with Wise Button.png', 'wise'),
      asset('Sourcing Center Download Invoice Button.png', 'download'),
    ]);
    const { token } = await apiFetch<{ token: string }>(
      `/invoices/${encodeURIComponent(id)}/public-download-token`,
      { token: accessToken, organizationId: organizationId ?? undefined },
    );
    const downloadUrl = publicInvoiceDownloadUrl(token);
    return renderToBuffer(buildPdfDocument(
      document, baseUrl, version, { wise, download }, downloadUrl,
    ));
  }
  if (usesBrandedInvoiceLayout(version) && document.type === 'invoices') {
    const org = await prepareTransparentSignature(document.org, (source) => transparentSignature(source, baseUrl));
    return renderToBuffer(buildPdfDocument({ ...document, org }, baseUrl, version));
  }
  return renderToBuffer(buildPdfDocument(document, baseUrl, version));
}
