import { randomBytes } from 'node:crypto';
import { shipmentProgress, shipmentProgressLabel } from '@flowbooks/shared';
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
  issueDate?: string;
  awaiting?: boolean;
  status?: string;
  staffTrackingStatus?: string;
  shippedAt: string | null;
  shipmentUpdatedAt?: string | null;
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

function trackShipmentButton() {
  return '<a class="track-shipment" href="https://www.sourcing.center/track" target="_blank" rel="noopener noreferrer">Track shipment <span aria-hidden="true">↗</span></a>';
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
  const status = shipmentProgressLabel(shipment.fulfillmentStatus,shipment.status,shipment.shippingMethod);
  const stages = shipmentProgress(shipment.fulfillmentStatus,shipment.status,shipment.shippingMethod);
  const completed = stages.filter(stage => stage.state === 'completed').length;
  const checkmark = '<svg class="ios-check" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="M4.1 8.1 6.8 10.8 12 5.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const progress = inactive ? '' : '<section class="progress-panel"><div class="progress-heading"><strong>Order progress</strong><span>'+completed+' of '+stages.length+' completed</span></div><div class="progress-track" aria-hidden="true">'+stages.map(stage=>'<span class="'+stage.state+'"></span>').join('')+'</div><ol class="shipment-progress" aria-label="Order progress">'+stages.map(stage=>'<li class="'+stage.state+'"'+(stage.state==='in-progress'?' aria-current="step"':'')+'><span class="progress-icon" aria-hidden="true">'+(stage.state==='completed'?checkmark:'')+'</span><span>'+escapeHtml(stage.label)+'</span></li>').join('')+'</ol></section>';
  return '<article><header><div><p class="eyebrow">Invoice ' + escapeHtml(shipment.number) + '</p>' +
    '<h2>' + escapeHtml(shipment.partnerOrderNumber ? 'Order ' + shipment.partnerOrderNumber : shipment.number) + '</h2></div>' +
    '<span class="badge' + (shipment.awaiting || inactive ? ' awaiting' : '') + '">' + escapeHtml(status) + '</span></header>' +
    progress + '<dl class="details">' + detail('Recipient', shipment.endRecipientName || 'Not provided') +
    detail('Delivery address', [shipment.endRecipientAddress, shipment.shipmentContact?.addressLine2,
      [shipment.shipmentContact?.city, shipment.shipmentContact?.region, shipment.shipmentContact?.postcode].filter(Boolean).join(' '),
      shipment.shipmentContact?.country].filter(Boolean).join('\n')) + detail('Destination', shipment.shippingToCountry) +
    detail('Carrier', shipment.shipmentCarrier) + detail('Tracking number', tracking || 'Not yet available') +
    detail('Carrier status', shipment.staffTrackingStatus || null) +
    detail('Shipment weight', shipment.shipmentWeightKg != null ? shipment.shipmentWeightKg + ' kg' : null) + detail('Invoice date', shipment.issueDate ? shipment.issueDate.slice(0, 10) : null) + '</dl><ul aria-label="Products">' + products + '</ul>' +
    '<dl class="totals">' + detail('Products', price(shipment.subtotal)) + detail('Shipping', price(shipment.shipping)) +
    (Number(shipment.discount) > 0 ? detail('Discount', price(shipment.discount)) : '') +
    (Number(shipment.taxAmount) > 0 ? detail('Tax', price(shipment.taxAmount)) : '') +
    detail('Total', price(shipment.total)) + '</dl>' + (tracking && !inactive ? trackShipmentButton() : '') + shipmentPhotos(photos) + '</article>';
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
      detail('Tracking number', validTracking(row.tracking) ? row.tracking : 'Pending') + '</dl>' + (validTracking(row.tracking) ? trackShipmentButton() : '') + shipmentPhotos(photos[index] ?? []) + '</article>').join('') + '</div></section>';
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
.track-shipment{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#8e1744;border:1px solid #8e1744;color:#fff;border-radius:12px;padding:10px 16px;font-weight:700;text-decoration:none;line-height:1.4;margin-top:16px;min-height:44px}.track-shipment:hover{background:#701237}.track-shipment:focus-visible{outline:3px solid #d894ae;outline-offset:3px}.top .track-shipment{margin-top:8px}
*{box-sizing:border-box}body{margin:0;background:#f7f6f5;color:#251b21;font:15px/1.5 system-ui,sans-serif}
/* Subtle, non-interactive Sourcing Center watermark across the customer shipment portal. */
body::after{content:"";position:fixed;inset:0;z-index:9999;pointer-events:none;user-select:none;background-repeat:repeat;background-size:360px 190px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='190' viewBox='0 0 360 190'%3E%3Ctext x='180' y='95' transform='rotate(-30 180 95)' text-anchor='middle' font-family='Arial,sans-serif' font-size='21' font-weight='600' fill='%23251b21' fill-opacity='.11'%3Ewww.sourcing.center%3C/text%3E%3C/svg%3E")}
@media(max-width:600px){body::after{background-size:280px 150px}}
main{max-width:1150px;margin:auto;padding:clamp(16px,4vw,48px)}.top,article header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
h1,h2,p,dl,dd{margin:0}h1{font-size:clamp(28px,6vw,45px);letter-spacing:-.04em;line-height:1.12}h2{font-size:19px;overflow-wrap:anywhere}
.eyebrow{color:#774356;font-size:12px;font-weight:700;margin-bottom:5px}.partner{color:#695c63;margin-top:6px}nav{display:flex;gap:8px;flex-wrap:wrap}
nav a{color:#781538;border:1px solid #e6d7dd;background:#fff;border-radius:999px;padding:8px 14px;text-decoration:none;font-weight:600}
.portal-brand{display:block;width:min(100%,310px);height:auto;margin:0 auto 24px;border-radius:0;background:transparent}
.top>div{min-width:0;max-width:100%}
.partner-name{position:relative;display:inline-block;max-width:100%;overflow-wrap:anywhere;vertical-align:middle;line-height:1.2;padding:.12em .25em .16em;margin:.12em 0;color:#67515b;font-weight:700;letter-spacing:-.025em;background:transparent}
.partner-name-letters{display:inline-block;color:#67515b;overflow-wrap:anywhere;max-width:100%}
@supports ((-webkit-background-clip:text) or (background-clip:text)){.partner-name-letters{background-image:linear-gradient(110deg,transparent 36%,#ffffff70 49%,transparent 61%),linear-gradient(180deg,#65515b 0%,#9c8892 23%,#83717b 40%,#5c4b54 56%,#705b65 82%,#65515b 100%);background-size:240% 100%,100% 100%;background-position:120% 0,0 0;background-repeat:no-repeat;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;-webkit-text-stroke:.2px #614e58;filter:drop-shadow(0 1px 0 #ffffff) drop-shadow(0 2px 2px #33333326)}}
.customer-id{margin-top:10px;color:#695c63;font-size:14px}.customer-id strong{color:#781538}
@media(prefers-reduced-motion:no-preference){.partner-name{animation:welcome-name .8s cubic-bezier(.2,.75,.25,1.15) both}.partner-name-letters{animation:welcome-glint 1.35s .35s ease-in-out both}}
@keyframes welcome-name{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes welcome-glint{from{background-position:120% 0,0 0}to{background-position:-120% 0,0 0}}
@media(prefers-reduced-transparency:reduce){.partner-name-letters{background:none;color:#67515b;-webkit-text-fill-color:currentColor;-webkit-text-stroke:0;filter:none;animation:none}}
@media(forced-colors:active){.partner-name-letters{background:none;color:CanvasText;-webkit-text-fill-color:CanvasText;-webkit-text-stroke:0;filter:none;animation:none}}
.attributes{white-space:pre-line;overflow-wrap:anywhere}.badge.awaiting{color:#795310;background:#fff1d5}
.shipment-progress{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 9px;padding:8px;margin:0 0 10px;border:1px solid #eadfe5;border-radius:9px;list-style:none;background:#faf8f9}.shipment-progress li{display:flex;align-items:flex-start;gap:5px;padding:0;border:0;min-width:0;font-size:11px;line-height:1.3;color:#77808d}.shipment-progress li span:last-child{min-width:0;overflow-wrap:anywhere}.shipment-progress li.completed{color:#18764b;font-weight:650}.shipment-progress li.in-progress{color:#b41649;font-weight:700}.progress-icon{width:13px;height:13px;border-radius:50%;border:1.5px solid #c8cbd0;display:grid;place-items:center;flex:none;font-size:9px;line-height:1;box-sizing:border-box}.completed .progress-icon{color:white;background:#198754;border-color:#198754}.in-progress .progress-icon{border:2px solid #f7c3d5;border-top-color:#e40046;animation:progress-spin .9s linear infinite}@keyframes progress-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.in-progress .progress-icon{animation:none}}
.progress-panel{padding:9px;border:1px solid #ecdce3;border-radius:12px;background:linear-gradient(145deg,#fff,#fbf6f8);margin-bottom:10px}.progress-heading{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;color:#695c63;line-height:1.3}.progress-heading strong{font-size:12px;color:#781538}.progress-track{display:flex;gap:3px;margin:7px 0;height:4px}.progress-track span{flex:1;border-radius:9px;background:#e6dfe3}.progress-track .completed{background:#24a36e}.progress-track .in-progress{background:linear-gradient(90deg,#8e1744,#e75180)}.progress-panel .shipment-progress{padding:0;margin:0;border:0;background:none;gap:4px}.progress-panel .shipment-progress li{align-items:center;padding:4px 5px;border:1px solid #eae5e8;border-radius:7px;background:#fff;color:#69636c;min-height:25px}.progress-panel .shipment-progress li.completed{background:#edf9f2;border-color:#d9efe3;color:#176145}.progress-panel .shipment-progress li.in-progress{background:#fcebf2;border-color:#ecc0d2;color:#8e1744;box-shadow:inset 2px 0 #b41649}.progress-panel .progress-icon{width:14px;height:14px}.progress-panel .pending .progress-icon{border-color:#ada4ab}
nav a[aria-current=true]{background:#8e1744;color:#fff}.shipments{display:grid;gap:14px;margin:22px 0}.grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))}
article,.empty,.inventory{background:#fff;border:1px solid #ece4e7;border-radius:18px;padding:clamp(14px,3vw,24px);min-width:0}article header{margin-bottom:16px}.badge{font-size:12px;font-weight:700;color:#176145;background:#e7f6ed;border-radius:999px;padding:5px 10px}
.details{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr));gap:10px 16px}dt,small{color:#695c63;font-size:12px}dd{overflow-wrap:anywhere;white-space:pre-line;font-weight:600}
ul{padding:0;margin:16px 0;list-style:none;border-top:1px solid #efe9eb}li{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #efe9eb}li strong{overflow-wrap:anywhere}small{display:block}
img,.photo{width:48px;height:48px;object-fit:cover;border-radius:8px;background:#f4edf0}.totals{display:flex;flex-wrap:wrap;gap:8px 20px}.totals div:last-child dd{color:#8e1744}.pagination{margin-top:16px}.inventory{margin-top:20px}.inventory ul{margin-bottom:0}.inventory li{grid-template-columns:48px minmax(0,1fr) minmax(90px,auto)}.inventory .totals{gap:5px 12px}.inventory li:last-child{border-bottom:0}.shipment-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:16px}.shipment-photos img{width:100%;height:100px;object-fit:cover}
@media(max-width:600px){main{padding:10px}.portal-brand{width:min(100%,220px);margin-bottom:14px}h1{font-size:24px}h2{font-size:15px}.partner{font-size:12px}.top,article header{gap:6px}.shipments{gap:8px;margin:12px 0}article,.empty,.inventory{padding:10px;border-radius:12px}article header{margin-bottom:8px}.badge{font-size:10px;padding:4px 7px}.eyebrow{font-size:10px;margin-bottom:2px}.details{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px}dt,small{font-size:10px}dd{font-size:12px}article ul{margin:8px 0}article ul li{grid-template-columns:36px minmax(0,1fr) auto;gap:7px;padding:6px 0;font-size:12px}article ul img,article ul .photo{width:36px;height:36px;border-radius:6px}.totals{gap:6px 12px}.shipment-photos{margin-top:8px;gap:5px}.shipment-photos img{height:75px}nav a{padding:6px 10px;font-size:11px}}
.shipments article{box-shadow:0 3px 16px #40112b08}.shipments article header{border-bottom:1px solid #f1e7ec;padding-bottom:9px}.shipments article .totals{background:#faf6f8;border-radius:8px;padding:8px 10px}.shipments article .totals div:last-child{margin-left:auto}.shipments article .totals div:last-child dd{font-size:1.15em;font-weight:750}
/* Liquid glass: luminous edge reflections over a neutral silver-white wallpaper. */
body{min-height:100vh;background:#efefef;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;isolation:isolate}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse at 4% 14%,#fff 0%,transparent 45%),radial-gradient(ellipse at 92% 22%,#dadada 0%,transparent 48%),radial-gradient(ellipse at 12% 58%,#e4e4e4 0%,transparent 48%),radial-gradient(ellipse at 90% 90%,#fff 0%,transparent 49%),linear-gradient(135deg,#fafafa 0%,#e9e9e9 35%,#dedede 63%,#f8f8f8 100%)}
article,.empty,.inventory{position:relative;background:linear-gradient(145deg,#ffffff9c 0%,#ffffff42 48%,#ffffff73 100%);border:1px solid #ffffffe6;border-radius:24px;box-shadow:0 14px 36px #39305522,0 2px 5px #39305512,inset 0 2px 1px #fff,inset 0 -2px 3px #ffffff88,inset 2px 0 4px #ffffff80;-webkit-backdrop-filter:blur(28px) saturate(175%);backdrop-filter:blur(28px) saturate(175%)}
article::before,.inventory::before,.empty::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(118deg,#ffffff80 0%,#ffffff0c 24%,transparent 44%,#ffffff30 76%,transparent 92%);box-shadow:inset 0 0 0 1px #ffffff65;z-index:-1}
.shipments article{box-shadow:0 14px 36px #39305522,0 2px 5px #39305512,inset 0 2px 1px #fff,inset 0 -2px 3px #ffffff88,inset 2px 0 4px #ffffff80}.shipments article header{border-color:#6a416224}
.progress-panel{background:linear-gradient(155deg,#ffffffad,#ffffff38);border:1px solid #ffffffef;border-radius:16px;box-shadow:0 5px 13px #593e6a14,inset 0 2px 1px #ffffffee,inset 0 -2px 3px #ffffff65}.progress-track{height:5px}.progress-track span{background:#bdb2cf76;box-shadow:inset 0 1px 2px #38263a29}.progress-track .completed{background:linear-gradient(180deg,#95efd0 0%,#3eb88e 42%,#188654 100%);box-shadow:inset 0 1px 0 #ffffffc0,0 1px 3px #16865430}.progress-track .in-progress{background:linear-gradient(180deg,#fbb2d1,#bc3872 65%,#8e1744);box-shadow:0 0 6px #c9447960,inset 0 1px 0 #ffffffb0}
.progress-panel .shipment-progress li{border:1px solid #ffffffe6;background:linear-gradient(170deg,#ffffffb3 0%,#ffffff38 52%,#ffffff78 100%);border-radius:10px;box-shadow:0 2px 5px #4b234615,inset 0 1px 1px #fff,inset 0 -1px 2px #ffffff88}.progress-panel .shipment-progress li.completed{background:linear-gradient(165deg,#f1fff8d9,#a7e8d18c 55%,#e0f9e9ab);border-color:#ffffffe6;color:#125a3c}.progress-panel .shipment-progress li.in-progress{background:linear-gradient(165deg,#fff1faca,#ed9fbc8c 55%,#ffd8e8c2);border-color:#fff;color:#781238;box-shadow:0 3px 8px #a8215440,inset 0 2px 1px #fff,inset 0 -1px 3px #ffffffb3}.completed .progress-icon{background:linear-gradient(180deg,#8becbd,#37ad7d 42%,#147a4c);border-color:#298f61;box-shadow:0 1px 3px #157a3440,inset 0 1px 0 #ffffff90}
.badge{background:linear-gradient(165deg,#ffffffdd,#bdebd5aa 57%,#e5ffefbb);box-shadow:0 2px 5px #24674214,inset 0 1px 1px #fff;border:1px solid #ffffffed}.badge.awaiting{background:linear-gradient(165deg,#fffdf6e8,#f5d7a4aa,#fff4d3cc)}.shipments article .totals{background:linear-gradient(155deg,#ffffffa8,#ffffff35);border:1px solid #fff;box-shadow:0 2px 8px #593e6a13,inset 0 2px 1px #fff,inset 0 -1px 2px #ffffff88;border-radius:13px}
nav a{background:linear-gradient(165deg,#ffffffdb,#ffffff42 57%,#ffffff99);border-color:#fff;box-shadow:0 4px 12px #4f243a1b,inset 0 2px 1px #fff,inset 0 -1px 2px #ffffff99;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}nav a[aria-current=true],.track-shipment{background:linear-gradient(170deg,#c65d88 0%,#a32b59 42%,#80163e 55%,#91204c 100%);border-color:#ab4b70;box-shadow:0 5px 12px #8e17443d,inset 0 2px 1px #ffffff9c,inset 0 -2px 2px #3e061b38}.track-shipment{border-radius:999px}.track-shipment:hover{background:linear-gradient(170deg,#b64c77,#751136)}
@media(max-width:600px){article,.empty,.inventory{border-radius:19px}.progress-panel{border-radius:14px}}
.progress-panel .completed .progress-icon{width:16px;height:16px;border:0;background:linear-gradient(165deg,#34c759,#249d46);color:#fff;box-shadow:inset 0 1px 1px #ffffff70,0 1px 2px #166b3633}.ios-check{width:14px;height:14px;display:block}
@media(prefers-reduced-transparency:reduce){body::before{display:none}article,.empty,.inventory{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}.progress-panel,.shipments article .totals{background:#faf6f8}.progress-panel .shipment-progress li,nav a{background:#fff}nav a[aria-current=true],.track-shipment{background:#8e1744}.progress-panel .shipment-progress li.completed{background:#e0f5e9}.progress-panel .shipment-progress li.in-progress{background:#fce4ef}}
`;

const refreshScript = `let busy=false;async function refreshOrders(){if(busy||document.hidden||window.getSelection()?.toString())return;busy=true;try{const response=await fetch(location.href,{cache:'no-store',credentials:'same-origin',redirect:'error'});if(!response.ok&&response.status!==404)return;const doc=new DOMParser().parseFromString(await response.text(),'text/html');const next=doc.querySelector('main');const current=document.querySelector('main');if(!next||!current)return;if(next.innerHTML!==current.innerHTML){const y=window.scrollY;current.replaceChildren(...Array.from(next.childNodes));window.scrollTo(0,y)}}catch{}finally{busy=false}}setInterval(refreshOrders,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshOrders()});`;

function documentBody(content: string, status = 200) {
  const nonce = randomBytes(16).toString('base64');
  const live = status === 200;
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Customer orders &amp; shipments · SoloFlow</title><style>' + styles + '</style><body><main>' + content + '</main>' + (live ? '<script nonce="' + nonce + '">' + refreshScript + '</script>' : '') + '</body></html>';
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
      '<div class="top"><div><h1>Welcome, <span class="partner-name"><span class="partner-name-letters">' +
      escapeHtml(data.partner) + '</span></span></h1>' +
      (customerId ? '<p class="customer-id">Customer ID <strong>' + escapeHtml(customerId) + '</strong></p>' : '') +
      '</div><div>' + nav + trackShipmentButton() + '</div></div>' +
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
