import { randomBytes } from 'node:crypto';
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
  awaiting?: boolean;
  status?: string;
  staffTrackingStatus?: string;
  shippedAt: string | null;
  shipmentWeightKg: string | null;
  partnerOrderNumber: string | null;
  endRecipientName: string | null;
  endRecipientAddress: string | null;
  shipmentContact?: { addressLine2?: string; city?: string; region?: string; postcode?: string; country?: string };
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

function shipmentCard(shipment: Shipment, photos: string[]) {
  const currency = shipment.currency;
  const price = (amount: string) => money(amount, currency);
  const products = shipment.items.map((item) => {
    const image = imageUrl(item.imageUrl);
    const title = item.name || item.description || 'Product';
    const photo = image
      ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '" loading="lazy" referrerpolicy="no-referrer">'
      : '<div class="photo" aria-hidden="true"></div>';
    return '<li>' + photo + '<div><strong>' + escapeHtml(title) + '</strong>' +
      (item.description?.trim() && item.description.trim() !== title.trim()
        ? '<small class="attributes">' + escapeHtml(item.description.trim()) + '</small>' : '') +
      '<small>' + escapeHtml(Number(item.quantity) + ' × ' + price(item.unitPrice)) + '</small></div>' +
      '<b>' + escapeHtml(price(item.amount)) + '</b></li>';
  }).join('');
  const tracking = shipment.internationalTrackingNumber || (shipment.shippingMethod === 'LOCAL' ? shipment.localTrackingNumber : null);
  const inactive = shipment.status === 'CANCELLED' || shipment.status === 'VOID';
  const status = inactive ? (shipment.status === 'VOID' ? 'Void' : 'Cancelled') :
    shipment.fulfillmentStatus === 'SHIPPED_TO_CHINA_CENTER' && shipment.shippingMethod === 'LOCAL' ? 'Shipped' :
    shipment.fulfillmentStatus ? fulfillmentStatusLabel(shipment.fulfillmentStatus) : 'Awaiting shipment';
  const shipped = shipment.shippedAt ? new Intl.DateTimeFormat('en', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Shanghai',
  }).format(new Date(shipment.shippedAt)) : null;
  return '<article><header><div><p class="eyebrow">Invoice ' + escapeHtml(shipment.number) + '</p>' +
    '<h2>' + escapeHtml(shipment.partnerOrderNumber ? 'Order ' + shipment.partnerOrderNumber : shipment.number) + '</h2></div>' +
    '<span class="badge' + (shipment.awaiting || inactive ? ' awaiting' : '') + '">' + escapeHtml(status) + '</span></header>' +
    '<dl class="details">' + detail('Recipient', shipment.endRecipientName || 'Not provided') +
    detail('Delivery address', [shipment.endRecipientAddress, shipment.shipmentContact?.addressLine2,
      [shipment.shipmentContact?.city, shipment.shipmentContact?.region, shipment.shipmentContact?.postcode].filter(Boolean).join(' '),
      shipment.shipmentContact?.country].filter(Boolean).join('\n')) + detail('Destination', shipment.shippingToCountry) +
    detail('Carrier', shipment.shipmentCarrier) + detail('Tracking number', tracking || (shipment.awaiting ? 'Awaiting shipment' : 'Pending')) +
    detail('Carrier status', shipment.staffTrackingStatus || null) +
    detail('Shipment weight', shipment.shipmentWeightKg != null ? shipment.shipmentWeightKg + ' kg' : null) + detail('Shipped on', shipped) + '</dl><ul aria-label="Products">' + products + '</ul>' +
    '<dl class="totals">' + detail('Products', price(shipment.subtotal)) + detail('Shipping', price(shipment.shipping)) +
    (Number(shipment.discount) > 0 ? detail('Discount', price(shipment.discount)) : '') +
    (Number(shipment.taxAmount) > 0 ? detail('Tax', price(shipment.taxAmount)) : '') +
    detail('Total', price(shipment.total)) + '</dl>' + shipmentPhotos(photos) + '</article>';
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

type ImportedShipment = { order: string; tracking: string; recipient: string; carrier: string; origin: string; destination: string; postcode: string; status?: string };

function importedHistory(rows: ImportedShipment[], view: 'list' | 'grid', photos: string[][]) {
  if (!rows.length) return '';
  return '<section aria-label="Imported shipment history"><h2>Imported shipment history</h2><div class="shipments ' + view + '">' +
    rows.map((row, index) => '<article><header><h2>' + escapeHtml(row.order ? 'Order ' + row.order : 'Shipment') +
      '</h2><span class="badge">' + escapeHtml(row.status && row.status !== 'Unknown' ? row.status : validTracking(row.tracking) ? 'Tracking recorded' : 'Tracking pending') + '</span></header>' +
      '<dl class="details">' + detail('Recipient', row.recipient) + detail('Origin', row.origin) +
      detail('Destination', row.destination) + detail('Postcode', row.postcode) + detail('Carrier', row.carrier) +
      detail('Tracking number', validTracking(row.tracking) ? row.tracking : 'Pending') + '</dl>' + shipmentPhotos(photos[index] ?? []) + '</article>').join('') + '</div></section>';
}

const sourcingOrigin = 'https://sourcing.center';

type SourceCustomer = { id: string; number: string | null; prefix: string | null; sourcingEnabled?: boolean };

function validTracking(value: string | null | undefined) {
  const clean = (value ?? '').trim().toUpperCase();
  return clean && !/^(WAITING.*|PENDING|UNKNOWN|N\/?A|NONE|-)$/i.test(clean) ? clean : '';
}
function normalizedOrder(value: string | null | undefined) {
  return (value ?? '').trim().replace(/^#+\s*/, '').toUpperCase();
}
function sameOrder(a: Pick<ImportedShipment, 'order' | 'tracking'>, b: Pick<ImportedShipment, 'order' | 'tracking'>) {
  const first = validTracking(a.tracking);
  const second = validTracking(b.tracking);
  if (first && second && first === second) return true;
  const order = normalizedOrder(a.order);
  return Boolean(order && order === normalizedOrder(b.order) && (!first || !second));
}
function invoiceReference(shipment: Shipment) {
  return { order: shipment.partnerOrderNumber || shipment.number, tracking: shipment.internationalTrackingNumber || shipment.localTrackingNumber || '' };
}

async function loadLiveStaffOrders(customer: SourceCustomer | undefined): Promise<ImportedShipment[] | null> {
  const key = process.env.PARTNER_SHIPMENT_PHOTO_KEY;
  const customerId = process.env.PARTNER_SHIPMENT_PHOTO_CUSTOMER_ID;
  if (!key || !customer?.number || (!customer.sourcingEnabled && customer.id !== customerId)) return [];
  try {
    const response = await fetch(sourcingOrigin + '/api/partner-shipment-orders', {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ number: customer.number, prefix: customer.prefix ?? '' }),
    });
    if (!response.ok) return null;
    const { shipments } = await response.json();
    if (!Array.isArray(shipments)) return null;
    const fields = ['order', 'tracking', 'recipient', 'carrier', 'origin', 'destination', 'postcode', 'status'] as const;
    return shipments.filter((row: unknown): row is ImportedShipment => Boolean(row && typeof row === 'object' &&
      fields.every((field) => typeof (row as Record<string, unknown>)[field] === 'string')));
  } catch {
    return null;
  }
}

function mergeStaffOrders(invoices: Shipment[], imported: ImportedShipment[], live: ImportedShipment[]) {
  const unmatched = imported.filter(row => !invoices.some(invoice => sameOrder(invoiceReference(invoice), row)));
  const history: ImportedShipment[] = [];
  for (const row of live) {
    const invoice = invoices.find(invoice => sameOrder(invoiceReference(invoice), row));
    if (invoice) {
      if (row.status && row.status !== 'Unknown') invoice.staffTrackingStatus = row.status;
      if (!validTracking(invoiceReference(invoice).tracking) && validTracking(row.tracking)) {
        if (invoice.shippingMethod === 'LOCAL') invoice.localTrackingNumber = row.tracking;
        else invoice.internationalTrackingNumber = row.tracking;
      }
      if (!invoice.shipmentCarrier && row.carrier) invoice.shipmentCarrier = row.carrier;
      continue;
    }
    let index = unmatched.findIndex(previous => sameOrder(previous, row));
    // If a single matching order was imported with a corrected tracking code,
    // treat the live staff record as the current source rather than duplicating it.
    if (index < 0 && normalizedOrder(row.order)) {
      const matches = unmatched.map((previous, i) => ({ previous, i })).filter(({ previous }) => normalizedOrder(previous.order) === normalizedOrder(row.order));
      const liveMatches = live.filter(candidate => normalizedOrder(candidate.order) === normalizedOrder(row.order));
      if (matches.length === 1 && liveMatches.length === 1) index = matches[0].i;
    }
    const previous = index >= 0 ? unmatched.splice(index, 1)[0] : undefined;
    history.push(previous ? { ...previous, ...Object.fromEntries(Object.entries(row).filter(([, value]) => value !== '')) } : row);
  }
  return [...history, ...unmatched];
}

async function loadShipmentPhotos(customer: SourceCustomer | undefined, rows: Pick<ImportedShipment, 'order' | 'tracking'>[]): Promise<string[][]> {
  const key = process.env.PARTNER_SHIPMENT_PHOTO_KEY;
  const customerId = process.env.PARTNER_SHIPMENT_PHOTO_CUSTOMER_ID;
  if (!key || !customer?.number || !rows.length || (!customer.sourcingEnabled && customer.id !== customerId)) return [];
  try {
    const response = await fetch(sourcingOrigin + '/api/partner-shipment-photos', {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(3000),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ number: customer.number, prefix: customer.prefix ?? '', orders: rows.map(({ order, tracking }) => ({ order, tracking })) }),
    });
    if (!response.ok) return [];
    const { photos } = await response.json();
    return Array.isArray(photos) ? photos.map((group: unknown) => Array.isArray(group) ? group.filter((value): value is string =>
      typeof value === 'string' && /^\/api\/partner-shipment-photos\/[a-z0-9-]+\/[a-z0-9-]+\?expires=\d{10}&signature=[A-Za-z0-9_-]{43}$/.test(value)) : []) : [];
  } catch {
    return [];
  }
}

function shipmentPhotos(paths: string[]) {
  if (!paths.length) return '';
  return '<div class="shipment-photos" aria-label="Shipment photos">' + paths.map((path, index) => {
    const url = escapeHtml(sourcingOrigin + path);
    return '<a href="' + url + '" target="_blank" rel="noreferrer"><img src="' + url + '" alt="Shipment photo ' +
      (index + 1) + '" loading="lazy" referrerpolicy="no-referrer"></a>';
  }).join('') + '</div>';
}

const styles = `
*{box-sizing:border-box}body{margin:0;background:#f7f6f5;color:#251b21;font:15px/1.5 system-ui,sans-serif}
/* Subtle, non-interactive Sourcing Center watermark across the customer shipment portal. */
body::after{content:"";position:fixed;inset:0;z-index:9999;pointer-events:none;user-select:none;background-repeat:repeat;background-size:360px 190px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='190' viewBox='0 0 360 190'%3E%3Ctext x='180' y='95' transform='rotate(-30 180 95)' text-anchor='middle' font-family='Arial,sans-serif' font-size='21' font-weight='600' fill='%23251b21' fill-opacity='.11'%3Ewww.sourcing.center%3C/text%3E%3C/svg%3E")}
@media(max-width:600px){body::after{background-size:280px 150px}}
main{max-width:1150px;margin:auto;padding:clamp(16px,4vw,48px)}.top,article header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
h1,h2,p,dl,dd{margin:0}h1{font-size:clamp(28px,6vw,45px);letter-spacing:-.04em;line-height:1.12}h2{font-size:19px;overflow-wrap:anywhere}
.eyebrow{color:#774356;font-size:12px;font-weight:700;margin-bottom:5px}.partner{color:#695c63;margin-top:6px}nav{display:flex;gap:8px;flex-wrap:wrap}
nav a{color:#781538;border:1px solid #e6d7dd;background:#fff;border-radius:999px;padding:8px 14px;text-decoration:none;font-weight:600}
.portal-brand{display:block;width:min(100%,310px);height:auto;margin-bottom:24px;border-radius:0;background:transparent}
.partner-name{display:inline-block;overflow-wrap:anywhere}
.customer-id{margin-top:10px;color:#695c63;font-size:14px}.customer-id strong{color:#781538}
@media(prefers-reduced-motion:no-preference){.partner-name{animation:welcome-name .65s ease-out both}}
@keyframes welcome-name{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.attributes{white-space:pre-line;overflow-wrap:anywhere}.badge.awaiting{color:#795310;background:#fff1d5}
nav a[aria-current=true]{background:#8e1744;color:#fff}.shipments{display:grid;gap:14px;margin:22px 0}.grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))}
article,.empty,.inventory{background:#fff;border:1px solid #ece4e7;border-radius:18px;padding:clamp(14px,3vw,24px);min-width:0}article header{margin-bottom:16px}.badge{font-size:12px;font-weight:700;color:#176145;background:#e7f6ed;border-radius:999px;padding:5px 10px}
.details{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr));gap:10px 16px}dt,small{color:#695c63;font-size:12px}dd{overflow-wrap:anywhere;white-space:pre-line;font-weight:600}
ul{padding:0;margin:16px 0;list-style:none;border-top:1px solid #efe9eb}li{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #efe9eb}li strong{overflow-wrap:anywhere}small{display:block}
img,.photo{width:48px;height:48px;object-fit:cover;border-radius:8px;background:#f4edf0}.totals{display:flex;flex-wrap:wrap;gap:8px 20px}.totals div:last-child dd{color:#8e1744}.pagination{margin-top:16px}.inventory{margin-top:20px}.inventory ul{margin-bottom:0}.inventory li{grid-template-columns:48px minmax(0,1fr) minmax(90px,auto)}.inventory .totals{gap:5px 12px}.inventory li:last-child{border-bottom:0}.shipment-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:16px}.shipment-photos img{width:100%;height:100px;object-fit:cover}
`;

const refreshScript = `let busy=false;async function refreshOrders(){if(busy||document.hidden||window.getSelection()?.toString())return;busy=true;try{const response=await fetch(location.href,{cache:'no-store',credentials:'same-origin',redirect:'error'});if(!response.ok&&response.status!==404)return;const doc=new DOMParser().parseFromString(await response.text(),'text/html');const next=doc.querySelector('main');const current=document.querySelector('main');if(!next||!current)return;if(next.innerHTML!==current.innerHTML){const y=window.scrollY;current.replaceChildren(...Array.from(next.childNodes));window.scrollTo(0,y)}}catch{}finally{busy=false}}setInterval(refreshOrders,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshOrders()});`;

function documentBody(content: string, status = 200) {
  const nonce = randomBytes(16).toString('base64');
  const live = status === 200;
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Dropshipping shipments · SoloFlow</title><style>' + styles + '</style><body><main>' + content + '</main>' + (live ? '<script nonce="' + nonce + '">' + refreshScript + '</script>' : '') + '</body></html>';
  return new Response(html, { status, headers: live ? { ...headers, 'Content-Security-Policy': headers['Content-Security-Policy'] + "; script-src 'nonce-" + nonce + "'; connect-src 'self'" } : headers });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const search = new URL(request.url).searchParams;
  const view = search.get('view') === 'grid' ? 'grid' : 'list';
  const unavailable = '<h1>Private shipment link unavailable</h1><p>Ask your supplier for a new link.</p>';
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return documentBody(unavailable, 404);
  try {
    type PortalData = { partner: string; shipments: Shipment[]; stock?: Stock[]; importedShipments?: ImportedShipment[]; sourceCustomer?: SourceCustomer; hasMore: boolean };
    const getOrders = (page: number) => fetch(getServerApiBaseUrl() + '/dropship-portal/shipments?page=' + page + '&status=all&complete=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(25_000),
    });
    const upstream = await getOrders(1);
    if (upstream.status === 404) return documentBody(unavailable, 404);
    if (!upstream.ok) throw new Error('Shipment service unavailable');
    const data: PortalData = await upstream.json();
    // During rolling releases, the previous API version still paginates.
    for (let page = 2; data.hasMore && page <= 9999; page++) {
      const response = await getOrders(page);
      if (!response.ok) throw new Error('Shipment page unavailable');
      const more: PortalData = await response.json();
      data.shipments.push(...more.shipments);
      data.hasMore = more.hasMore;
    }
    if (data.hasMore) throw new Error('Incomplete shipment history');
    const live = await loadLiveStaffOrders(data.sourceCustomer);
    const history = mergeStaffOrders(data.shipments, data.importedShipments ?? [], live ?? []);
    const photoRows = [...history, ...data.shipments.map((shipment) => ({
      order: shipment.partnerOrderNumber || shipment.number,
      tracking: shipment.internationalTrackingNumber || shipment.localTrackingNumber || '',
    }))];
    const photos: string[][] = [];
    // The photo endpoint permits at most 2,000 order references per request.
    for (let offset = 0; offset < photoRows.length; offset += 2000) {
      const batch = photoRows.slice(offset, offset + 2000);
      const groups = await loadShipmentPhotos(data.sourceCustomer, batch);
      photos.push(...batch.map((_, i) => groups[i] ?? []));
    }
    const href = (mode: 'list' | 'grid') => '?view=' + mode;
    const customerId = data.sourceCustomer?.number
      ? [data.sourceCustomer.prefix, data.sourceCustomer.number].filter(Boolean).join('-')
      : null;
    const nav = '<nav aria-label="Shipment layout"><a aria-current="' + (view === 'list') + '" href="' + href('list') +
      '">List</a><a aria-current="' + (view === 'grid') + '" href="' + href('grid') + '">Grid</a></nav>';
    const cards = data.shipments.map((shipment, index) =>
      shipmentCard(shipment, photos[history.length + index] ?? [])).join('');
    return documentBody('<img class="portal-brand" src="/icons/partner-portal-logo.png" alt="Sourcing Center by Seven Color Trading Co Ltd">' +
      '<div class="top"><div><h1>Welcome, <span class="partner-name">' +
      escapeHtml(data.partner) + '</span></h1>' +
      (customerId ? '<p class="customer-id">Customer ID <strong>' + escapeHtml(customerId) + '</strong></p>' : '') +
      '</div>' + nav + '</div>' +
      '<p class="partner">' + (data.shipments.length + history.length) + ' orders · Updates automatically every 30 seconds</p>' +
      (live === null ? '<p class="partner">Live staff tracking is temporarily unavailable. Showing saved order history.</p>' : '') +
      '<section aria-label="All shipments" class="shipments ' + view + '">' +
      (cards || (history.length ? '' : '<p class="empty">No orders yet.</p>')) +
      '</section>' +
      importedHistory(history, view, photos) + inventory(data.stock ?? []));
  } catch {
    return documentBody('<h1>Shipments are temporarily unavailable</h1><p>Please try again shortly.</p>', 503);
  }
}
