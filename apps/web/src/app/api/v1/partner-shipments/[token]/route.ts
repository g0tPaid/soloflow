import { fulfillmentStatusLabel } from '@flowbooks/shared';
import { getServerApiBaseUrl } from '@/lib/server-api-url';

export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' https: data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

type Item = {
  name: string | null;
  description: string;
  imageUrl: string | null;
  quantity: string;
  unitPrice: string;
  amount: string;
};

type Shipment = {
  number: string;
  shippedAt: string | null;
  shipmentWeightKg: string | null;
  partnerOrderNumber: string | null;
  endRecipientName: string | null;
  endRecipientAddress: string | null;
  shipmentCarrier: string | null;
  shippingToCountry: string | null;
  shippingMethod: string | null;
  fulfillmentStatus: string | null;
  internationalTrackingNumber: string | null;
  localTrackingNumber: string | null;
  currency: string;
  subtotal: string;
  shipping: string;
  taxAmount: string;
  discount: string;
  total: string;
  items: Item[];
};

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]!);
}

function imageUrl(value: string | null) {
  if (!value) return null;
  if (/^\/uploads\/[\w./%+-]+$/.test(value) && !value.includes('..')) return value;
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function money(amount: string, currency: string) {
  const number = Number(amount);
  if (!Number.isFinite(number)) return '—';
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'code' }).format(number);
  } catch {
    return currency + ' ' + number.toFixed(2);
  }
}

function detail(label: string, value: string | null) {
  if (!value) return '';
  return '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
}

function shipmentCard(shipment: Shipment) {
  const currency = shipment.currency;
  const price = (amount: string) => money(amount, currency);
  const products = shipment.items.map((item) => {
    const image = imageUrl(item.imageUrl);
    const title = item.name || item.description || 'Product';
    const photo = image
      ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '" loading="lazy" referrerpolicy="no-referrer">'
      : '<div class="photo" aria-hidden="true"></div>';
    return '<li>' + photo + '<div><strong>' + escapeHtml(title) + '</strong>' +
      '<small>' + escapeHtml(Number(item.quantity) + ' × ' + price(item.unitPrice)) + '</small></div>' +
      '<b>' + escapeHtml(price(item.amount)) + '</b></li>';
  }).join('');
  const tracking = shipment.internationalTrackingNumber || (shipment.shippingMethod === 'LOCAL' ? shipment.localTrackingNumber : null);
  const status = shipment.fulfillmentStatus === 'SHIPPED_TO_CHINA_CENTER'
    ? 'Shipped' : fulfillmentStatusLabel(shipment.fulfillmentStatus);
  const shipped = shipment.shippedAt ? new Intl.DateTimeFormat('en', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Shanghai',
  }).format(new Date(shipment.shippedAt)) : null;
  return '<article><header><div><p class="eyebrow">Invoice ' + escapeHtml(shipment.number) + '</p>' +
    '<h2>' + escapeHtml(shipment.partnerOrderNumber ? 'Order ' + shipment.partnerOrderNumber : shipment.number) + '</h2></div>' +
    '<span class="badge">' + escapeHtml(status) + '</span></header>' +
    '<dl class="details">' + detail('Recipient', shipment.endRecipientName || 'Not provided') +
    detail('Delivery address', shipment.endRecipientAddress) + detail('Destination', shipment.shippingToCountry) +
    detail('Carrier', shipment.shipmentCarrier) + detail('Tracking number', tracking || 'Pending') +
    detail('Shipment weight', shipment.shipmentWeightKg != null ? shipment.shipmentWeightKg + ' kg' : null) + detail('Shipped on', shipped) + '</dl><ul aria-label="Products">' + products + '</ul>' +
    '<dl class="totals">' + detail('Products', price(shipment.subtotal)) + detail('Shipping', price(shipment.shipping)) +
    (Number(shipment.discount) > 0 ? detail('Discount', price(shipment.discount)) : '') +
    (Number(shipment.taxAmount) > 0 ? detail('Tax', price(shipment.taxAmount)) : '') +
    detail('Total', price(shipment.total)) + '</dl></article>';
}

type Stock = { name: string; sku: string | null; imageUrl: string | null; allocated: string; shipped: string; remaining: string };

function inventory(rows: Stock[]) {
  if (!rows.length) return '';
  return '<section class="inventory" aria-label="Partner stock"><h2>Your stock</h2><ul>' + rows.map((row) => {
    const image = imageUrl(row.imageUrl);
    const thumb = image ? '<img src="' + escapeHtml(image) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<div class="photo" aria-hidden="true"></div>';
    return '<li>' + thumb + '<div><strong>' + escapeHtml(row.name) + '</strong>' +
      (row.sku ? '<small>' + escapeHtml(row.sku) + '</small>' : '') + '</div><dl class="totals">' +
      detail('Allocated', row.allocated) + detail('Shipped', row.shipped) + detail('In stock', row.remaining) + '</dl></li>';
  }).join('') + '</ul></section>';
}

const styles = `
*{box-sizing:border-box}body{margin:0;background:#f7f6f5;color:#251b21;font:15px/1.5 system-ui,sans-serif}
main{max-width:1150px;margin:auto;padding:clamp(16px,4vw,48px)}.top,article header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
h1,h2,p,dl,dd{margin:0}h1{font-size:clamp(28px,6vw,45px);letter-spacing:-.04em;line-height:1.12}h2{font-size:19px;overflow-wrap:anywhere}
.eyebrow{color:#774356;font-size:12px;font-weight:700;margin-bottom:5px}.partner{color:#695c63;margin-top:6px}nav{display:flex;gap:8px;flex-wrap:wrap}
nav a{color:#781538;border:1px solid #e6d7dd;background:#fff;border-radius:999px;padding:8px 14px;text-decoration:none;font-weight:600}
nav a[aria-current=true]{background:#8e1744;color:#fff}.shipments{display:grid;gap:14px;margin:22px 0}.grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))}
article,.empty,.inventory{background:#fff;border:1px solid #ece4e7;border-radius:18px;padding:clamp(14px,3vw,24px);min-width:0}article header{margin-bottom:16px}.badge{font-size:12px;font-weight:700;color:#176145;background:#e7f6ed;border-radius:999px;padding:5px 10px}
.details{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr));gap:10px 16px}dt,small{color:#695c63;font-size:12px}dd{overflow-wrap:anywhere;white-space:pre-line;font-weight:600}
ul{padding:0;margin:16px 0;list-style:none;border-top:1px solid #efe9eb}li{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #efe9eb}li strong{overflow-wrap:anywhere}small{display:block}
img,.photo{width:48px;height:48px;object-fit:cover;border-radius:8px;background:#f4edf0}.totals{display:flex;flex-wrap:wrap;gap:8px 20px}.totals div:last-child dd{color:#8e1744}.pagination{margin-top:16px}.inventory{margin-top:20px}.inventory ul{margin-bottom:0}.inventory li{grid-template-columns:48px minmax(0,1fr) minmax(90px,auto)}.inventory .totals{gap:5px 12px}.inventory li:last-child{border-bottom:0}
`;

function documentBody(content: string, status = 200) {
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Dropshipping shipments · SoloFlow</title><style>' + styles + '</style><body><main>' + content + '</main></body></html>';
  return new Response(html, { status, headers });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const search = new URL(request.url).searchParams;
  const view = search.get('view') === 'grid' ? 'grid' : 'list';
  const rawPage = search.get('page') ?? '';
  const page = /^\d{1,4}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const unavailable = '<h1>Private shipment link unavailable</h1><p>Ask your supplier for a new link.</p>';
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return documentBody(unavailable, 404);
  try {
    const upstream = await fetch(getServerApiBaseUrl() + '/dropship-portal/shipments?page=' + page, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(12_000),
    });
    if (upstream.status === 404) return documentBody(unavailable, 404);
    if (!upstream.ok) throw new Error('Shipment service unavailable');
    const data: { partner: string; shipments: Shipment[]; stock?: Stock[]; hasMore: boolean } = await upstream.json();
    const href = (mode: 'list' | 'grid', number: number) => '?view=' + mode + '&amp;page=' + number;
    const nav = '<nav aria-label="Shipment layout"><a aria-current="' + (view === 'list') + '" href="' + href('list', page) +
      '">List</a><a aria-current="' + (view === 'grid') + '" href="' + href('grid', page) + '">Grid</a></nav>';
    const previous = page > 1 ? '<a href="' + href(view, page - 1) + '">Previous</a>' : '';
    const next = data.hasMore && page < 9999 ? '<a href="' + href(view, page + 1) + '">Next</a>' : '';
    return documentBody('<div class="top"><div><p class="eyebrow">SoloFlow · Sourcing Center</p><h1>Your shipments</h1>' +
      '<p class="partner">' + escapeHtml(data.partner) + '</p></div>' + nav + '</div>' + inventory(data.stock ?? []) +
      '<section aria-label="Shipped orders" class="shipments ' + view + '">' +
      (data.shipments.length ? data.shipments.map(shipmentCard).join('') : '<p class="empty">No shipments on this page.</p>') +
      '</section>' + (previous || next ? '<nav class="pagination" aria-label="Shipment pages">' + previous + next + '</nav>' : ''));
  } catch {
    return documentBody('<h1>Shipments are temporarily unavailable</h1><p>Please try again shortly.</p>', 503);
  }
}
