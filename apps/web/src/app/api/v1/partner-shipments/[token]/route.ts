import { createHash, randomBytes } from 'node:crypto';
import { shipmentProgress, shipmentProgressLabel, isCustomerTier, CUSTOMER_TIER_LABELS } from '@flowbooks/shared';
import { getServerApiBaseUrl } from '@/lib/server-api-url';
import { resolveCountry } from '@/lib/countries';

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

// One cached sprite supplies all eight 3D landmarks, including the current stage hero.
function stageIllustration(value: string) {
  return '<span class="stage-art" data-stage="'+escapeHtml(value)+'" aria-hidden="true"></span>';
}

function customerFlag(country: unknown) {
  const resolved = resolveCountry(country);
  if (!resolved) return '';
  const {name, flag} = resolved;
  return '<span class="customer-flag" role="img" aria-label="'+escapeHtml(name)+'" title="'+escapeHtml(name)+'">'+flag+'</span>';
}

function tierBadge(tier: unknown) {
  if (!isCustomerTier(tier)) return '';
  return '<div class="customer-tier-line"><span class="customer-tier tier-'+tier.toLowerCase()+'"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5 20 6v7c0 4-4 7-8 8.5C8 20 4 17 4 13V6l8-3.5Z" fill="currentColor" opacity=".17" stroke="currentColor" stroke-width="1.6"/><path d="m12 6.5 1.6 3.2 3.5.5-2.5 2.5.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.5 3.5-.5Z" fill="currentColor"/></svg>'+CUSTOMER_TIER_LABELS[tier]+' Customer</span></div>';
}

function shipmentCard(shipment: Shipment, photos: string[], deferInlineImages = false) {
  const currency = shipment.currency;
  const price = (amount: string) => money(amount, currency);
  const products = shipment.items.map((item) => {
    const image = deferInlineImages && item.imageUrl?.startsWith('data:') ? null : imageUrl(item.imageUrl);
    const title = item.name || item.description || 'Product';
    const photo = image
      ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '" width="48" height="48" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
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
  const allDone = completed === stages.length;
  const currentStage = stages.find(stage => stage.state === 'in-progress') ?? stages.find(stage => stage.state === 'pending') ?? stages[stages.length - 1];
  const checkmark = '<svg class="ios-check" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="M4.1 8.1 6.8 10.8 12 5.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const progress = inactive ? '' : '<section class="progress-panel" aria-label="Order progress"><div class="stage-hero'+(allDone?' all-done':'')+'"><div class="hero-art">'+stageIllustration(currentStage.value)+'</div><div class="hero-copy"><span class="hero-kicker">'+(allDone?'ORDER COMPLETE':'CURRENT STAGE')+'</span><strong>'+escapeHtml(currentStage.label)+'</strong></div></div><div class="progress-heading"><div class="progress-steps" role="progressbar" aria-label="Order completion" aria-valuemin="0" aria-valuemax="'+stages.length+'" aria-valuenow="'+completed+'" aria-valuetext="'+completed+' of '+stages.length+' stages completed">'+stages.map(stage=>'<span class="'+stage.state+'" aria-hidden="true"></span>').join('')+'</div><span class="progress-count">'+completed+' of '+stages.length+' completed</span></div><ol class="shipment-progress" aria-label="Order progress">'+stages.map(stage=>'<li class="'+stage.state+'"'+(stage.state==='in-progress'?' aria-current="step"':'')+'><span class="stage-visual" aria-hidden="true">'+stageIllustration(stage.value)+'</span><span class="stage-label">'+escapeHtml(stage.label)+'</span><span class="progress-icon" aria-hidden="true">'+(stage.state==='completed'?checkmark:'')+'</span></li>').join('')+'</ol></section>';
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

function inventory(rows: Stock[], deferInlineImages = false) {
  if (!rows.length) return '';
  return '<section class="inventory" aria-label="Partner stock"><h2>Your stock</h2><ul>' + rows.map((row) => {
    const image = deferInlineImages && row.imageUrl?.startsWith('data:') ? null : imageUrl(row.imageUrl);
    const thumb = image ? '<img src="' + escapeHtml(image) + '" alt="" width="48" height="48" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '<div class="photo" aria-hidden="true"></div>';
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

function hasStaffIntegration(customer: SourceCustomer | undefined) {
  return Boolean(process.env.PARTNER_SHIPMENT_PHOTO_KEY && customer?.number &&
    (customer.sourcingEnabled || customer.id === process.env.PARTNER_SHIPMENT_PHOTO_CUSTOMER_ID));
}

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
      (index + 1) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>';
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
.partner-name{position:relative;display:inline-block;max-width:100%;overflow-wrap:anywhere;vertical-align:middle;line-height:1.2;padding:.12em .25em .16em;margin:.12em 0;color:#c62835;font-weight:700;letter-spacing:-.025em;background:transparent}
.partner-name-letters{display:inline-block;color:#c62835;overflow-wrap:anywhere;max-width:100%}
@supports ((-webkit-background-clip:text) or (background-clip:text)){.partner-name-letters{background-image:linear-gradient(110deg,transparent 38%,#ffffff15 43%,#ffffff99 49%,#ffffff15 55%,transparent 60%),linear-gradient(180deg,#c62835 0%,#d94750 22%,#c62835 48%,#ba2431 57%,#c62835 100%);background-size:270% 100%,100% 100%;background-position:100% 0,0 0;background-repeat:no-repeat;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;-webkit-text-stroke:.2px #ad2731;filter:drop-shadow(0 1px 0 #ffffff) drop-shadow(0 2px 2px #33333320)}}
.customer-id{margin-top:10px;color:#695c63;font-size:14px}.customer-id strong{color:#781538}
@media(prefers-reduced-motion:no-preference){.partner-name{animation:welcome-name .8s cubic-bezier(.2,.75,.25,1.15) both}.partner-name-letters{animation:welcome-glint 7.5s .6s linear infinite}}
@keyframes welcome-name{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes welcome-glint{0%{background-position:100% 0,0 0}78%,100%{background-position:0 0,0 0}}
@media(prefers-reduced-transparency:reduce){.partner-name-letters{background:none;color:#c62835;-webkit-text-fill-color:currentColor;-webkit-text-stroke:0;filter:none;animation:none}}
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
.loading-details{color:#695c63;font-size:12px;margin:6px 0}.loading-details a{color:#781538}
/* Defer offscreen cards until needed; all order records remain in the document. */
@supports (content-visibility:auto){.shipments.list article:not(:first-child){content-visibility:auto;contain-intrinsic-size:auto 300px}}
@media(max-width:600px){article,.empty,.inventory{-webkit-backdrop-filter:blur(12px) saturate(135%);backdrop-filter:blur(12px) saturate(135%)}nav a{-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}}
.progress-panel .completed .progress-icon{width:16px;height:16px;border:0;background:linear-gradient(165deg,#34c759,#249d46);color:#fff;box-shadow:inset 0 1px 1px #ffffff70,0 1px 2px #166b3633}.ios-check{width:14px;height:14px;display:block}
.progress-panel .shipment-progress li{gap:8px;min-height:39px;padding:5px 6px}.stage-visual{position:relative;display:grid;place-items:center;flex:0 0 31px;width:31px;height:31px;border-radius:10px;background:linear-gradient(155deg,#ffffffdf,#ffffff35);box-shadow:inset 0 1px 1px #fff,0 1px 3px #29202d12;--art-fill:#cdd0d52e}.stage-art{width:25px;height:25px;display:block;color:#73727a}.completed .stage-visual{--art-fill:#48b58c42}.completed .stage-art{color:#18764b}.in-progress .stage-visual{--art-fill:#d7508640}.in-progress .stage-art{color:#a02050;animation:stage-float 2.6s ease-in-out infinite}.stage-visual .progress-icon{position:absolute;right:-3px;bottom:-3px;background:#f5f5f5;box-shadow:0 0 0 1px #fff}.progress-panel .stage-visual .progress-icon{width:11px;height:11px}.progress-panel .completed .stage-visual .progress-icon{width:13px;height:13px}.stage-visual .ios-check{width:11px;height:11px}.stage-label{flex:1;min-width:0}@keyframes stage-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}@media(prefers-reduced-motion:reduce){.in-progress .stage-art{animation:none}}@media(max-width:350px){.progress-panel .shipment-progress li{gap:5px;padding:4px}.stage-visual{flex-basis:26px;width:26px;height:26px}.stage-art{width:22px;height:22px}}
@media(prefers-reduced-transparency:reduce){body::before{display:none}article,.empty,.inventory{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}.progress-panel,.shipments article .totals{background:#faf6f8}.progress-panel .shipment-progress li,nav a{background:#fff}nav a[aria-current=true],.track-shipment{background:#8e1744}.progress-panel .shipment-progress li.completed{background:#e0f5e9}.progress-panel .shipment-progress li.in-progress{background:#fce4ef}}
/* Premium customer portal: a single large status landmark and compact glass tiles. */
body::after{opacity:.43}body::before{background:radial-gradient(ellipse at 15% 0%,#fff,transparent 65%),linear-gradient(145deg,#fafafa,#e4e4e6 52%,#f7f7f8)}
.portal-brand{width:min(100%,280px);margin:0 auto 14px}.top h1{font-size:clamp(20px,4.5vw,30px);font-weight:600;letter-spacing:-.035em}.partner-name{display:block;padding:0;margin:3px 0;line-height:1.17;font-weight:750;color:#8e1744}.partner-name-letters{color:#8e1744;background:none;-webkit-text-fill-color:currentColor;-webkit-text-stroke:0;filter:none;animation:none}.top{align-items:center}.top>div:last-child{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.top .track-shipment{margin:0;padding:8px 14px;min-height:38px;font-size:13px}
.shipments article{box-shadow:0 8px 25px #28232a15,inset 0 2px 1px #fff,inset 0 -2px 3px #ffffffa0}.shipments article header{background:linear-gradient(155deg,#ffffffa8,#ffffff47);border:1px solid #fff;border-radius:14px;padding:10px 12px;align-items:center;margin-bottom:10px}.shipments article header h2{font-weight:750;font-size:clamp(15px,3vw,20px);line-height:1.2}
.progress-panel{padding:0;border:0;background:none;box-shadow:none;margin:0 0 14px}.stage-hero{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);align-items:center;gap:10px;padding:9px 12px 3px;border-radius:17px 17px 0 0;background:linear-gradient(150deg,#ffffffc9,#f3f3f4b0);border:1px solid #fff;border-bottom:0;min-height:126px}.hero-art{display:grid;place-items:center;min-width:0;isolation:isolate}.hero-copy{min-width:0}.hero-kicker{display:block;color:#747179;font-size:10px;font-weight:750;letter-spacing:.1em;margin-bottom:5px}.hero-copy strong{display:block;font-size:clamp(19px,3vw,28px);line-height:1.14;letter-spacing:-.045em;color:#201c23;overflow-wrap:anywhere}.all-done .hero-copy strong{color:#176145}.stage-art{display:block;width:100%;aspect-ratio:1;background-image:url('/icons/order-progress-3d.webp');background-size:400% 200%;background-repeat:no-repeat;mix-blend-mode:multiply;max-width:100%;height:auto}.stage-art[data-stage=AWAITING_PAYMENT]{background-position:0 0}.stage-art[data-stage=LOCAL_ORDERING_COMPLETED]{background-position:33.3333% 0}.stage-art[data-stage=WAREHOUSE_RECEIVED]{background-position:66.6667% 0}.stage-art[data-stage=QC_COMPLETED]{background-position:100% 0}.stage-art[data-stage=SHIPPED_TO_CHINA_CENTER]{background-position:0 100%}.stage-art[data-stage=SHIPPED_INTERNATIONAL]{background-position:33.3333% 100%}.stage-art[data-stage=CUSTOMER_RECEIVED]{background-position:66.6667% 100%}.stage-art[data-stage=ORDER_COMPLETED]{background-position:100% 100%}.hero-art .stage-art{width:min(100%,180px);filter:drop-shadow(0 4px 4px #2f242515)}
.progress-heading{display:grid;grid-template-columns:auto minmax(30px,1fr) auto;gap:9px;align-items:center;padding:7px 12px 12px;margin-bottom:9px;background:linear-gradient(150deg,#ffffffc9,#f3f3f4b0);border:1px solid #fff;border-top:0;border-radius:0 0 17px 17px;font-size:11px;white-space:nowrap}.progress-heading .progress-percent{font-size:23px;color:#8e1744;font-weight:800;letter-spacing:-.06em}.progress-meter{height:9px;border-radius:99px;background:#dedde1;box-shadow:inset 0 1px 2px #34303a15;overflow:hidden}.progress-meter>span{height:100%;display:block;background:linear-gradient(180deg,#b95177,#8e1744 55%,#681230);border-radius:99px;box-shadow:inset 0 1px 1px #ffffff80;transition:width .5s ease}
.progress-panel .shipment-progress{gap:6px}.progress-panel .shipment-progress li{min-height:58px;padding:5px 7px;gap:7px;border-radius:13px;background:linear-gradient(145deg,#ffffffda,#f0f0f2a0);box-shadow:0 2px 4px #25212910,inset 0 1px 1px #fff;color:#29262c;font-size:12px;line-height:1.22;font-weight:550}.progress-panel .shipment-progress li.completed{background:linear-gradient(145deg,#f8fff8,#e2f3e7);color:#176145}.progress-panel .shipment-progress li.in-progress{background:linear-gradient(145deg,#fff6f8,#f3dfe7);border-color:#a73a62;color:#781238;box-shadow:inset 0 1px 1px #fff,0 2px 5px #a73a6219}.stage-visual{flex:0 0 47px;width:47px;height:47px;background:none;box-shadow:none;border-radius:0;isolation:isolate}.stage-visual .stage-art{width:100%;height:auto}.progress-panel .shipment-progress .progress-icon{width:13px;height:13px;flex:none;margin-left:auto}.progress-panel .shipment-progress .completed .progress-icon{width:15px;height:15px}.pending .stage-art{opacity:.85}.in-progress .stage-art{animation:none}.hero-art .stage-art{animation:hero-hover 4s ease-in-out infinite}.all-done .hero-art .stage-art{animation:hero-celebrate .7s ease-out both}@keyframes hero-hover{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes hero-celebrate{0%{transform:scale(.9)}70%{transform:scale(1.04)}100%{transform:scale(1)}}
.shipments article .details{padding:11px;border:1px solid #fff;border-radius:14px;background:linear-gradient(145deg,#ffffff9c,#ffffff42);gap:10px 14px}.shipments article ul[aria-label=Products] li{grid-template-columns:56px minmax(0,1fr) auto;gap:10px}.shipments article ul[aria-label=Products] img,.shipments article ul[aria-label=Products] .photo{width:56px;height:56px;object-fit:contain;background:#fff9;border-radius:10px}.shipments article .totals{padding:9px 12px}.shipments article .totals div:last-child dd{font-size:1.3em}
@media(max-width:600px){main{padding:12px}.portal-brand{width:min(100%,220px);margin-bottom:12px}.shipments article{padding:10px}.stage-hero{padding:6px 8px 0;gap:8px;min-height:115px}.hero-copy strong{font-size:clamp(17px,5vw,22px)}.hero-art .stage-art{width:min(100%,145px)}.progress-heading{padding:6px 9px 10px;gap:6px;font-size:10px}.progress-heading .progress-percent{font-size:21px}.progress-panel .shipment-progress li{min-height:55px;padding:4px 5px;gap:5px;font-size:11px}.stage-visual{flex-basis:38px;width:38px;height:38px}.progress-panel .shipment-progress .progress-icon{width:11px;height:11px}.progress-panel .shipment-progress .completed .progress-icon{width:13px;height:13px}.shipments article ul[aria-label=Products] li{grid-template-columns:46px minmax(0,1fr) auto;gap:8px}.shipments article ul[aria-label=Products] img,.shipments article ul[aria-label=Products] .photo{width:46px;height:46px}}
@media(max-width:350px){.stage-visual{flex-basis:29px;width:29px;height:29px}.progress-panel .shipment-progress li{gap:4px;font-size:10px}.hero-copy strong{font-size:17px}.progress-heading{font-size:9px}.progress-heading .progress-percent{font-size:18px}}
@media(prefers-reduced-motion:reduce){.hero-art .stage-art,.all-done .hero-art .stage-art{animation:none}.progress-meter>span{transition:none}}@media(prefers-reduced-transparency:reduce){.stage-hero,.progress-heading,.shipments article .details{background:#fff}}
.hero-art,.stage-visual{isolation:auto;mix-blend-mode:multiply}.stage-art{mix-blend-mode:normal}.hero-art .stage-art{filter:none}.shipment-progress .stage-label{overflow-wrap:anywhere}.shipment-progress .pending .progress-icon{border-color:#97949c}
/* Brand the render with the authentic company lockup and the original 7 mark, cropped from the existing transparent logo. */
.stage-art{position:relative}.stage-art::after{content:none;position:absolute;pointer-events:none;background-repeat:no-repeat;background-image:url('/icons/partner-portal-logo.webp')}.stage-art[data-stage=WAREHOUSE_RECEIVED]::after{content:"";left:53%;top:32%;width:27%;aspect-ratio:2005/490;background-size:contain;mix-blend-mode:multiply;opacity:.9;transform:skewY(2deg)}
.stage-art[data-stage=AWAITING_PAYMENT]::after,.stage-art[data-stage=SHIPPED_TO_CHINA_CENTER]::after,.stage-art[data-stage=SHIPPED_INTERNATIONAL]::after{content:"";width:12%;aspect-ratio:132/163;background-size:1519% auto;background-position:27.12% 95.7%;filter:brightness(0) invert(1);opacity:.94}.stage-art[data-stage=AWAITING_PAYMENT]::after{left:66%;top:36%;transform:rotate(-8deg)}.stage-art[data-stage=SHIPPED_TO_CHINA_CENTER]::after{left:16%;top:39%;width:9%;transform:skewY(-7deg)}.stage-art[data-stage=SHIPPED_INTERNATIONAL]::after{left:26%;top:35%;width:7%;transform:rotate(-21deg)}
.partner-name{display:block;color:#c42335;line-height:1.25;font-weight:800;letter-spacing:-.035em}.partner-name-letters{display:inline;color:#c42335;background-image:linear-gradient(112deg,transparent 36%,#fff7 47%,transparent 59%),linear-gradient(180deg,#e34c57 3%,#c12539 42%,#9e182c 54%,#c8293e 96%);background-size:260% 100%,100% 100%;background-position:100% 0,0 0;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;-webkit-text-stroke:.15px #a51b2d;filter:drop-shadow(0 1px 0 #fff) drop-shadow(0 2px 2px #9f24311a);box-decoration-break:clone;-webkit-box-decoration-break:clone}.customer-flag{display:inline-block;vertical-align:baseline;margin-left:.27em;font-size:.78em;line-height:1;letter-spacing:0;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;filter:drop-shadow(0 1px 1px #0002);white-space:nowrap}
@media(prefers-reduced-motion:no-preference){.partner-name-letters{animation:welcome-glint 8s 1s linear infinite}}@media(prefers-reduced-motion:reduce){.partner-name-letters{animation:none}}@media(prefers-reduced-transparency:reduce),(forced-colors:active){.partner-name-letters{color:#b42333;background:none;-webkit-text-fill-color:currentColor;-webkit-text-stroke:0;filter:none;animation:none}}
.progress-heading{grid-template-columns:minmax(0,1fr) auto;gap:9px;padding-top:9px}.progress-steps{display:flex;align-items:center;gap:4px;min-width:0}.progress-steps>span{flex:1;min-width:0;height:7px;border-radius:999px;background:linear-gradient(180deg,#e7e7ea,#ceced3);box-shadow:inset 0 1px 2px #28242b15}.progress-steps>.completed{background:linear-gradient(180deg,#91e6ba,#2fbd78 50%,#168556);box-shadow:inset 0 1px 1px #ffffffae,0 1px 3px #16855633}.progress-steps>.in-progress{background:linear-gradient(180deg,#ec94b4,#b82960 50%,#8e1744);box-shadow:inset 0 1px 1px #ffffffa0,0 0 5px #b8296040}.progress-count{font-weight:550;color:#65616a;white-space:nowrap}@media(max-width:350px){.progress-steps{gap:3px}.progress-heading{gap:6px}}
.customer-tier-line{margin:7px 0 4px}.customer-tier{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid #ffffffed;border-radius:999px;font-size:12px;font-weight:750;line-height:1.25;letter-spacing:.01em;box-shadow:0 3px 8px #28212b16,inset 0 1px 1px #fff,inset 0 -1px 2px #ffffff90}.customer-tier svg{width:17px;height:17px;flex:none}.tier-bronze{color:#713a20;background:linear-gradient(165deg,#fff3e7,#dba783 52%,#f2d2bf)}.tier-silver{color:#444951;background:linear-gradient(165deg,#fff,#d1d5dc 52%,#f4f5f7)}.tier-gold{color:#78500e;background:linear-gradient(165deg,#fff8d7,#f1c86d 52%,#ffedb6)}.tier-platinum{color:#364b67;background:linear-gradient(165deg,#fff,#c5d5e9 50%,#eef5ff);box-shadow:0 3px 8px #3c567520,inset 0 1px 1px #fff,inset 0 -1px 2px #ffffff90}.customer-tier-line+.customer-id{margin-top:5px}
`;

const refreshScript = `let busy=false,etag='';async function refreshOrders(){if(busy||document.hidden||window.getSelection()?.toString())return;busy=true;try{const url=new URL(location.href);url.searchParams.set('enriched','1');const response=await fetch(url,{cache:'no-store',credentials:'same-origin',redirect:'error',headers:etag?{'If-None-Match':etag}:{}});if(response.status===304)return;if(!response.ok&&response.status!==404)return;const doc=new DOMParser().parseFromString(await response.text(),'text/html');const next=doc.querySelector('main');const current=document.querySelector('main');if(!next||!current)return;if(next.innerHTML!==current.innerHTML){const y=window.scrollY;current.replaceChildren(...Array.from(next.childNodes));window.scrollTo(0,y)}delete current.dataset.deferred;etag=response.headers.get('etag')||''}catch{}finally{busy=false}}if(document.querySelector('main[data-deferred]'))setTimeout(refreshOrders,100);setInterval(refreshOrders,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshOrders()});`;

function documentBody(content: string, status = 200, options: { deferred?: boolean; ifNoneMatch?: string | null } = {}) {
  const nonce = randomBytes(16).toString('base64');
  const live = status === 200;
  // Weak ETag compares the rendered data and design, excluding the per-response CSP nonce.
  const etag = live ? 'W/"' + createHash('sha256').update(content).update(styles).update(refreshScript).update(String(options.deferred ?? false)).digest('hex') + '"' : null;
  if (etag && options.ifNoneMatch === etag) return new Response(null, { status: 304, headers: { ...headers, ETag: etag } });
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Customer orders &amp; shipments · SoloFlow</title><style>' + styles + '</style><body><main' + (options.deferred ? ' data-deferred="true"' : '') + '>' + content + '</main>' + (live ? '<script nonce="' + nonce + '">' + refreshScript + '</script>' : '') + '</body></html>';
  return new Response(html, { status, headers: live ? { ...headers, ETag: etag!, 'Content-Security-Policy': headers['Content-Security-Policy'] + "; script-src 'nonce-" + nonce + "'; connect-src 'self'" } : headers });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const search = new URL(request.url).searchParams;
  const view = search.get('view') === 'grid' ? 'grid' : 'list';
  const enriched = search.get('enriched') === '1';
  const unavailable = '<h1>Private shipment link unavailable</h1><p>Ask your supplier for a new link.</p>';
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return documentBody(unavailable, 404);
  try {
    type PortalData = { partner: string; customerCountry?: string | null; customerTier?: string | null; shipments: Shipment[]; stock?: Stock[]; importedShipments?: ImportedShipment[]; sourceCustomer?: SourceCustomer; hasMore: boolean };
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
    const inlineImages = data.shipments.some(shipment => shipment.items.some(item => item.imageUrl?.startsWith('data:'))) ||
      (data.stock ?? []).some(row => row.imageUrl?.startsWith('data:'));
    const deferred = !enriched && (hasStaffIntegration(data.sourceCustomer) || inlineImages);
    const live = deferred ? [] : await loadLiveStaffOrders(data.sourceCustomer);
    const history = mergeStaffOrders(data.shipments, data.importedShipments ?? [], live ?? []);
    const photoRows = [...history, ...data.shipments.map((shipment) => ({
      order: shipment.partnerOrderNumber || shipment.number,
      tracking: shipment.internationalTrackingNumber || shipment.localTrackingNumber || '',
    }))];
    const photos: string[][] = [];
    // The photo endpoint permits at most 2,000 order references per request.
    for (let offset = 0; !deferred && offset < photoRows.length; offset += 2000) {
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
      shipmentCard(shipment, photos[history.length + index] ?? [], deferred)).join('');
    return documentBody('<img class="portal-brand" src="/icons/partner-portal-logo.webp" width="930" height="227" fetchpriority="high" alt="Sourcing Center by Seven Color Trading Co Ltd">' +
      '<div class="top"><div><h1>Welcome, <span class="partner-name"><span class="partner-name-letters">' +
      escapeHtml(data.partner) + '</span>' + customerFlag(data.customerCountry) + '</span></h1>' +
      tierBadge(data.customerTier) +
      (customerId ? '<p class="customer-id">Customer ID <strong>' + escapeHtml(customerId) + '</strong></p>' : '') +
      '</div><div>' + nav + trackShipmentButton() + '</div></div>' +
      '<p class="partner">' + (data.shipments.length + history.length) + ' orders · Updates automatically every 30 seconds</p>' +
      (deferred ? '<p class="loading-details" role="status">Loading additional order details and photos… <noscript><a href="?view=' + view + '&amp;enriched=1">Load full details</a></noscript></p>' : '') +
      (live === null ? '<p class="partner">Live staff tracking is temporarily unavailable. Showing saved order history.</p>' : '') +
      '<section aria-label="All shipments" class="shipments ' + view + '">' +
      (cards || (history.length || deferred ? '' : '<p class="empty">No orders yet.</p>')) +
      '</section>' +
      importedHistory(history, view, photos) + inventory(data.stock ?? [], deferred), 200, { deferred, ifNoneMatch: request.headers.get('if-none-match') });
  } catch {
    return documentBody('<h1>Shipments are temporarily unavailable</h1><p>Please try again shortly.</p>', 503);
  }
}
