import type { Invoice, Organization, OrganizationBranding } from '@/lib/api';
import { parseBranding, resolveImageSrcForPrint } from '@/lib/organization-branding';

/** Browser cache of logo, signature, offer, and line-item images for offline PDFs. */
export const PRINT_IMAGE_CACHE = 'soloflow-images';

function sniffImageMime(bytes: Uint8Array): 'image/png' | 'image/jpeg' | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  return null;
}

function isPdfImageDataUrl(value: string) {
  return /^data:image\/(png|jpeg|jpg)/i.test(value);
}

function bytesToDataUrl(bytes: Uint8Array, mime: 'image/png' | 'image/jpeg') {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function blobToPdfDataUrl(blob: Blob): Promise<string | null> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const sniffed = sniffImageMime(bytes);
  const headerMime = blob.type === 'image/png' || blob.type === 'image/jpeg' ? blob.type : null;
  const mime = sniffed ?? headerMime;
  if (!mime) return null;
  const dataUrl = bytesToDataUrl(bytes, mime);
  return isPdfImageDataUrl(dataUrl) ? dataUrl : null;
}

async function readCachedImage(url: string): Promise<Blob | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(PRINT_IMAGE_CACHE);
    const hit = await cache.match(url);
    if (!hit) return null;
    const blob = await hit.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

async function readImageBlob(url: string): Promise<Blob | null> {
  const cached = await readCachedImage(url);
  if (cached) return cached;
  if (typeof fetch === 'undefined') return null;
  try {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok || response.type === 'opaque') return null;
    const blob = await response.blob();
    if (blob.size === 0) return null;
    if (blob.type && !blob.type.startsWith('image/')) return null;
    return blob;
  } catch {
    return null;
  }
}

/**
 * Keep data URLs already stored on the device. Fetch other images when the
 * browser can read them. Drop the rest so @react-pdf/renderer does not fail
 * the whole PDF on a missing remote file.
 */
export async function inlinePrintImage(
  url: string | null | undefined,
  baseUrl: string,
): Promise<string | null> {
  const resolved = resolveImageSrcForPrint(url, baseUrl);
  if (!resolved) return null;
  if (resolved.startsWith('data:')) return isPdfImageDataUrl(resolved) ? resolved : null;
  const blob = await readImageBlob(resolved);
  if (!blob) return null;
  return blobToPdfDataUrl(blob);
}

export function collectOrganizationImageUrls(org: Organization): string[] {
  const branding = parseBranding(org.settings?.branding);
  return [
    org.logo,
    branding.invoiceBanner,
    branding.invoiceSignature,
    branding.invoiceOffer1,
    branding.invoiceOffer2,
    branding.invoiceOffer3,
    branding.invoiceOffer4,
  ].filter((url): url is string => !!url);
}

export function collectInvoiceImageUrls(invoice: Invoice): string[] {
  return (invoice.items ?? [])
    .flatMap((item) => [item.imageUrl, item.product?.imageUrl])
    .filter((url): url is string => !!url);
}

export async function cachePrintImageUrls(
  urls: Array<string | null | undefined>,
  baseUrl?: string,
): Promise<void> {
  if (typeof caches === 'undefined' || typeof fetch === 'undefined') return;
  const origin = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
  let cache: Cache;
  try {
    cache = await caches.open(PRINT_IMAGE_CACHE);
  } catch {
    return;
  }

  await Promise.all(
    urls.map(async (url) => {
      const resolved = resolveImageSrcForPrint(url, origin);
      if (!resolved || resolved.startsWith('data:') || resolved.startsWith('blob:')) return;
      try {
        if (await cache.match(resolved)) return;
        const response = await fetch(resolved, { credentials: 'same-origin' });
        if (!response.ok || response.type === 'opaque') return;
        const type = response.headers.get('content-type') ?? '';
        if (type && !type.startsWith('image/')) return;
        await cache.put(resolved, response);
      } catch {
        // Cross-origin images without CORS cannot be stored for offline PDFs.
      }
    }),
  );
}

async function inlineOptional(url: string | null | undefined, baseUrl: string) {
  if (!url) return url ?? undefined;
  return (await inlinePrintImage(url, baseUrl)) ?? undefined;
}

export async function embedInvoiceImages(
  invoice: Invoice,
  org: Organization,
  baseUrl: string,
): Promise<{ invoice: Invoice; org: Organization }> {
  const branding = parseBranding(org.settings?.branding);
  const [logo, invoiceBanner, invoiceSignature, invoiceOffer1, invoiceOffer2, invoiceOffer3, invoiceOffer4] =
    await Promise.all([
      inlinePrintImage(org.logo, baseUrl),
      inlineOptional(branding.invoiceBanner, baseUrl),
      inlineOptional(branding.invoiceSignature, baseUrl),
      inlineOptional(branding.invoiceOffer1, baseUrl),
      inlineOptional(branding.invoiceOffer2, baseUrl),
      inlineOptional(branding.invoiceOffer3, baseUrl),
      inlineOptional(branding.invoiceOffer4, baseUrl),
    ]);

  const nextBranding: OrganizationBranding = {
    ...branding,
    invoiceBanner,
    invoiceSignature,
    invoiceOffer1,
    invoiceOffer2,
    invoiceOffer3,
    invoiceOffer4,
  };

  const items = await Promise.all(
    (invoice.items ?? []).map(async (item) => ({
      ...item,
      imageUrl: await inlineOptional(item.imageUrl, baseUrl),
      product: item.product
        ? { ...item.product, imageUrl: await inlineOptional(item.product.imageUrl, baseUrl) }
        : item.product,
    })),
  );

  return {
    invoice: { ...invoice, items },
    org: {
      ...org,
      logo,
      settings: org.settings ? { ...org.settings, branding: nextBranding } : org.settings,
    },
  };
}
