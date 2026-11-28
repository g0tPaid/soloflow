import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';
import { fulfillmentStatusLabel } from '@flowbooks/shared';

const token = 'x'.repeat(43);
const path = 'https://soloflow.example/api/v1/partner-shipments/' + token;
const params = { params: Promise.resolve({ token }) };

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('private partner shipment view', () => {
  it('shows the selected layout, shipment details and charges with HTML escaping', async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({
      partner: '<script>alert(1)</script>',
      hasMore: false,
      stock: [{ name: 'Warehouse product', sku: 'WH', imageUrl: null, allocated: '20', shipped: '6', remaining: '14' }],
      shipments: [{
        shipmentWeightKg: '1.25', number: 'INV-100', partnerOrderNumber: 'ORDER-200', shippedAt: '2026-11-17T00:00:00Z',
        endRecipientName: 'Pat Example', endRecipientAddress: 'Unit 4', shipmentCarrier: 'Carrier',
        shippingToCountry: 'US', fulfillmentStatus: 'SHIPPED_INTERNATIONAL', internationalTrackingNumber: 'TRACK-300',
        currency: 'USD', subtotal: '14', shipping: '6', total: '20', discount: '0', taxAmount: '0',
        items: [{ name: 'Product', imageUrl: 'https://example.com/product.png', quantity: '2', unitPrice: '7', amount: '14' }],
      }],
    }));
    vi.stubGlobal('fetch', upstream);
    const response = await GET(new Request(path + '?view=grid&page=2'), params);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(html).toContain('class="shipments grid"');
    expect(html).toContain('href="?view=list"');
    expect(html).not.toContain('aria-label="Shipment pages"');
    for (const text of ['ORDER-200', 'Pat Example', 'TRACK-300', '1.25 kg', 'Warehouse product', 'In stock', 'product.png', '14.00', '6.00', '20.00']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain(token);
    expect(html).not.toContain('Pay with Wise');
    expect(html).not.toContain('wise.com/pay');
    expect(upstream).toHaveBeenCalledWith(expect.stringContaining('/dropship-portal/shipments?page=1&status=all&complete=true'),
      expect.objectContaining({ method: 'POST', cache: 'no-store', body: JSON.stringify({ token }) }));
  });

  it('greets the partner and includes awaiting orders in the shipment feed', async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({
      partner: 'Javier Example',
      sourceCustomer: { id: 'partner', prefix: 'SPAIN', number: '0042' },
      hasMore: false,
      shipments: [{
        number: 'INV-100', status: 'SENT', awaiting: true, partnerOrderNumber: '1007', fulfillmentStatus: null,
        currency: 'USD', subtotal: '14', shipping: '6', total: '20', discount: '0', taxAmount: '0',
        items: [{ name: 'Chair', description: 'Color: <Blue>', imageUrl: 'https://example.com/chair.png',
          quantity: '1', unitPrice: '14', amount: '14' }],
      }],
    }));
    vi.stubGlobal('fetch', upstream);
    const response = await GET(new Request(path), params);
    const html = await response.text();
    for (const label of ['Welcome, <span class="partner-name"><span class="partner-name-letters">Javier Example', 'SPAIN-0042', 'partner-portal-logo.webp', 'All shipments', 'Awaiting payment', 'Order 1007', 'Color: &lt;Blue&gt;', 'chair.png']) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain('Awaiting shipment');
    expect(upstream).toHaveBeenCalledWith(expect.stringContaining('page=1&status=all'), expect.anything());
  });

  it('shows payment completed and local ordering in progress for a paid order', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      partner: 'Partner', customerCountry: 'UAE', hasMore: false, shipments: [{
        number: 'INV-PAID', status: 'PAID', awaiting: true, fulfillmentStatus: null,
        currency: 'USD', subtotal: '0', shipping: '0', total: '0', discount: '0', taxAmount: '0', items: [],
      }],
    })));
    const html = await (await GET(new Request(path), params)).text();
    expect(html).toContain('Payment completed');
    expect(html).toContain('aria-label="United Arab Emirates" title="United Arab Emirates">🇦🇪');
    expect(html).toContain('class="ios-check"');
    expect(html).toContain('Local ordering in progress');
    expect(html).toContain('1 of 8 completed');
    expect(html).toContain('aria-valuemax="8" aria-valuenow="1" aria-valuetext="1 of 8 stages completed"');
    expect(html).toContain('<span class="completed" aria-hidden="true"></span><span class="in-progress" aria-hidden="true"></span><span class="pending" aria-hidden="true"></span>');
    expect(html).not.toContain('class="progress-percent"');
    expect(html).toContain('CURRENT STAGE');
    expect(html).toContain('order-progress-3d.webp');
    expect(html).toContain('<div class="hero-art"><span class="stage-art" data-stage="LOCAL_ORDERING_COMPLETED"');
    expect(html).toContain('class="in-progress" aria-current="step"');
    for (const stage of ['AWAITING_PAYMENT', 'LOCAL_ORDERING_COMPLETED', 'WAREHOUSE_RECEIVED', 'QC_COMPLETED', 'SHIPPED_TO_CHINA_CENTER', 'SHIPPED_INTERNATIONAL', 'CUSTOMER_RECEIVED', 'ORDER_COMPLETED']) {
      expect(html).toContain('class="stage-art" data-stage="' + stage + '"');
    }
    expect(html).not.toContain('Awaiting payment');
  });

  it('renders the German flag for existing customer country names', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ partner: 'Partner', customerCountry: 'GERMANY', hasMore: false, shipments: [] })));
    const html = await (await GET(new Request(path), params)).text();
    expect(html).toContain('aria-label="Germany" title="Germany">🇩🇪');
  });

  it.each(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'])('renders the %s tier below the customer name', async (tier) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ partner: 'Partner', customerTier: tier, hasMore: false, shipments: [] })));
    const html = await (await GET(new Request(path), params)).text();
    expect(html).toContain('</span></span></h1><div class="customer-tier-line"><span class="customer-tier tier-'+tier.toLowerCase()+'"');
    expect(html).toContain(tier[0]+tier.slice(1).toLowerCase()+' Tier Customer');
  });

  it('defaults an unassigned customer to Silver and renders the decorative VIP arrival', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ partner: 'New Customer', hasMore: false, shipments: [] })));
    const html = await (await GET(new Request(path), params)).text();
    expect(html).toContain('Silver Tier Customer');
    expect(html).toContain('class="vip-arrival" aria-hidden="true"');
    expect(html).toContain('id="vip-photographer"');
    expect(html).toContain('Awaiting your first order');
  });

  it('renders all orders, actual early stages and inactive status without pagination', async () => {
    const shipments = Array.from({ length: 45 }, (_, index) => ({
      number: 'INV-' + index, partnerOrderNumber: 'ORDER-' + index,
      status: index === 44 ? 'CANCELLED' : 'DRAFT', awaiting: true,
      fulfillmentStatus: index === 0 ? 'QC_COMPLETED' : null,
      currency: 'USD', subtotal: '0', shipping: '0', total: '0', discount: '0', taxAmount: '0', items: [],
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ partner: 'Partner', hasMore: false, shipments })));
    const response = await GET(new Request(path), params);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('45 orders');
    expect(html).toContain('ORDER-44');
    expect(html).toContain(fulfillmentStatusLabel('QC_COMPLETED'));
    expect(html).toContain('Cancelled');
    expect(html).not.toContain('aria-label="Shipment pages"');
    expect(response.headers.get('content-security-policy')).toContain("connect-src 'self'");
    expect(html).toContain('setInterval(refreshOrders,30000)');
  });

  it('collects all pages from the previous API during a rolling deployment', async () => {
    const make = (number: string) => ({ number, partnerOrderNumber: number, currency: 'USD', subtotal: '0', shipping: '0', total: '0', discount: '0', taxAmount: '0', items: [] });
    const upstream = vi.fn()
      .mockResolvedValueOnce(Response.json({ partner: 'Partner', hasMore: true, shipments: [make('FIRST')] }))
      .mockResolvedValueOnce(Response.json({ partner: 'Partner', hasMore: false, shipments: [make('LAST')] }));
    vi.stubGlobal('fetch', upstream);
    const response = await GET(new Request(path), params);
    const html = await response.text();
    expect(html).toContain('FIRST');
    expect(html).toContain('LAST');
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('combines imported history and live staff orders without duplicates and shows current statuses', async () => {
    vi.stubEnv('PARTNER_SHIPMENT_PHOTO_KEY', 'test-only-key');
    const row = (order: string, tracking: string, status = 'Unknown') => ({
      order, tracking, status, recipient: 'Example', carrier: 'DHL', origin: 'China', destination: 'US', postcode: '',
    });
    const upstream = vi.fn()
      .mockResolvedValueOnce(Response.json({
        partner: 'Partner', hasMore: false, shipments: [],
        sourceCustomer: { id: 'partner', number: '0042', prefix: 'A', sourcingEnabled: true },
        importedShipments: [row('#100', 'WAITING'), row('#101', 'TRACK101')],
      }))
      .mockResolvedValueOnce(Response.json({ shipments: [row('100', 'TRACK100', 'In Transit'), row('102', 'TRACK102', 'Delivered')] }))
      .mockResolvedValueOnce(Response.json({ photos: [[], [], []] }));
    vi.stubGlobal('fetch', upstream);
    const response = await GET(new Request(path + '?enriched=1'), params);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('3 orders');
    expect(html).toContain('In Transit');
    expect(html).toContain('Delivered');
    expect(html).toContain('Order 102');
    expect(html).toContain('Order #101');
    expect(html).not.toContain('WAITING');
    expect(upstream).toHaveBeenNthCalledWith(2, 'https://sourcing.center/api/partner-shipment-orders',
      expect.objectContaining({ body: JSON.stringify({ number: '0042', prefix: 'A' }), cache: 'no-store' }));
  });

  it('renders saved orders immediately, deferring external tracking and embedded images', async () => {
    vi.stubEnv('PARTNER_SHIPMENT_PHOTO_KEY', 'test-only-key');
    const inlinePhoto = 'data:image/png;base64,' + 'A'.repeat(240_000);
    const payload = { partner: 'Partner', hasMore: false,
      sourceCustomer: { id: 'partner', number: '0042', prefix: 'A', sourcingEnabled: true },
      shipments: [{ number: 'INV-FIRST', status: 'PAID', currency: 'USD', subtotal: '10', shipping: '0',
        total: '10', discount: '0', taxAmount: '0', items: [{ name: 'Chair', imageUrl: inlinePhoto, quantity: '1', unitPrice: '10', amount: '10' }] }] };
    const upstream = vi.fn().mockResolvedValueOnce(Response.json(payload))
      .mockResolvedValueOnce(Response.json(payload))
      .mockResolvedValueOnce(Response.json({ shipments: [] }))
      .mockResolvedValueOnce(Response.json({ photos: [[]] }));
    vi.stubGlobal('fetch', upstream);
    const first = await GET(new Request(path), params);
    const html = await first.text();
    expect(html).toContain('INV-FIRST');
    expect(html).toContain('data-deferred="true"');
    expect(html).toContain('Loading additional order details and photos');
    expect(html).not.toContain(inlinePhoto);
    expect(upstream).toHaveBeenCalledTimes(1);
    const full = await GET(new Request(path + '?enriched=1'), params);
    const fullHtml = await full.text();
    expect(fullHtml).toContain(inlinePhoto);
    expect(fullHtml.length - html.length).toBeGreaterThan(230_000);
    expect(upstream).toHaveBeenCalledTimes(4);
  });

  it('avoids re-sending unchanged HTML but rechecks the private token on each refresh', async () => {
    const payload = { partner: 'Partner', hasMore: false, shipments: [] };
    const upstream = vi.fn().mockResolvedValueOnce(Response.json(payload))
      .mockResolvedValueOnce(Response.json(payload))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', upstream);
    const full = await GET(new Request(path + '?enriched=1'), params);
    const etag = full.headers.get('etag')!;
    expect(etag).toMatch(/^W\/"[a-f0-9]{64}"$/);
    const req = new Request(path + '?enriched=1', { headers: { 'If-None-Match': etag } });
    const unchanged = await GET(req, params);
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe('');
    expect(unchanged.headers.get('cache-control')).toBe('private, no-store');
    const revoked = await GET(req, params);
    expect(revoked.status).toBe(404);
    expect(upstream).toHaveBeenCalledTimes(3);
  });
  it('renders regular customer invoices without reaching the external dropshipper history or photo endpoints', async () => {
    vi.stubEnv('PARTNER_SHIPMENT_PHOTO_KEY', 'test-only-key');
    const upstream = vi.fn().mockResolvedValue(Response.json({
      partner: 'Regular Buyer', hasMore: false, stock: [], importedShipments: [],
      shipments: [{ number: 'INV-REG-1', issueDate: '2026-11-27T00:00:00Z', shippedAt: '2026-11-28T00:00:00Z', shipmentUpdatedAt: '2026-11-29T00:00:00Z', status: 'PAID',
        fulfillmentStatus: 'SHIPPED_INTERNATIONAL', currency: 'USD', subtotal: '10', shipping: '0',
        total: '10', discount: '0', taxAmount: '0', items: [] }],
    }));
    vi.stubGlobal('fetch', upstream);
    const response = await GET(new Request(path), params);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('Regular Buyer');
    expect(html).toContain('INV-REG-1');
    expect(html).toContain('2026-11-27');
    expect(html.match(/Invoice date/g)).toHaveLength(1);
    expect(html).not.toContain('Last shipment update');
    expect(html).not.toContain('Shipped on');
    expect(html).toContain('Updates automatically every 30 seconds');
    expect(html).not.toContain('Your stock');
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('welcomes a new customer with a pending journey rather than a fabricated order', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ partner: 'New Buyer', customerCountry: 'US', customerTier: 'GOLD', hasMore: false, shipments: [] })));
    const html = await (await GET(new Request(path + '?view=grid'), params)).text();
    expect(html).toContain('Awaiting your first order');
    expect(html).toContain('class="first-order"');
    expect(html).toContain('0 of 8 completed');
    expect(html).toContain('aria-valuemax="8" aria-valuenow="0"');
    expect(html.match(/<li class="pending">/g)).toHaveLength(8);
    expect(html).toContain('Gold Tier Customer');
    expect(html).toContain('https://wa.me/8618059262730');
    expect(html).not.toContain('No orders yet.');
    expect(html).not.toContain('class="ios-check"');
    expect(html).not.toContain('Invoice date');
  });

  it('replaces first-order onboarding with the actual invoice on refresh', async () => {
    const initial = { partner: 'New Buyer', hasMore: false, shipments: [] };
    const invoice = { number: 'INV-FIRST', status: 'SENT', currency: 'USD', subtotal: '10', shipping: '0', total: '10', discount: '0', taxAmount: '0', items: [] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(initial)).mockResolvedValueOnce(Response.json({ ...initial, shipments: [invoice] })));
    const first = await GET(new Request(path), params);
    expect(await first.text()).toContain('Awaiting your first order');
    const next = await GET(new Request(path + '?enriched=1', { headers: { 'If-None-Match': first.headers.get('etag')! } }), params);
    expect(next.status).toBe(200);
    const html = await next.text();
    expect(html).toContain('INV-FIRST');
    expect(html).toContain('Awaiting payment');
    expect(html).not.toContain('Awaiting your first order');
  });

  it('does not show first-order onboarding while external history is loading or unavailable', async () => {
    vi.stubEnv('PARTNER_SHIPMENT_PHOTO_KEY', 'test-only-key');
    const payload = { partner: 'Partner', hasMore: false, shipments: [], sourceCustomer: { id: 'partner', number: '0042', prefix: 'A', sourcingEnabled: true } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(payload)).mockResolvedValueOnce(Response.json(payload)).mockResolvedValueOnce(new Response(null, { status: 503 })));
    const deferred = await (await GET(new Request(path), params)).text();
    expect(deferred).toContain('Loading additional order details');
    expect(deferred).not.toContain('Awaiting your first order');
    const unavailable = await (await GET(new Request(path + '?enriched=1'), params)).text();
    expect(unavailable).not.toContain('Awaiting your first order');
  });

  it('returns 404 for a revoked link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const response = await GET(new Request(path), params);
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('Private shipment link unavailable');
  });
});
