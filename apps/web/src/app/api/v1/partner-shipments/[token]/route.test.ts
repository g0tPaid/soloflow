import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const token = 'x'.repeat(43);
const path = 'https://soloflow.example/api/v1/partner-shipments/' + token;
const params = { params: Promise.resolve({ token }) };

afterEach(() => vi.unstubAllGlobals());

describe('private partner shipment view', () => {
  it('shows the selected layout, shipment details and charges with HTML escaping', async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({
      partner: '<script>alert(1)</script>',
      hasMore: true,
      shipments: [{
        number: 'INV-100', partnerOrderNumber: 'ORDER-200', shippedAt: '2026-11-17T00:00:00Z',
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
    expect(html).toContain('href="?view=list&amp;page=2"');
    expect(html).toContain('href="?view=grid&amp;page=3"');
    for (const text of ['ORDER-200', 'Pat Example', 'TRACK-300', 'product.png', '14.00', '6.00', '20.00']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain(token);
    expect(upstream).toHaveBeenCalledWith(expect.stringContaining('/dropship-portal/shipments?page=2'),
      expect.objectContaining({ method: 'POST', cache: 'no-store', body: JSON.stringify({ token }) }));
  });

  it('returns 404 for a revoked link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const response = await GET(new Request(path), params);
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('Private shipment link unavailable');
  });
});
