import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Invoice, Organization } from '@/lib/api';
import { embedInvoiceImages, inlinePrintImage } from '@/lib/print-pdf/embed-print-images';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function invoice(): Invoice {
  return {
    id: 'inv_1',
    organizationId: 'org_1',
    number: 'INV-00001',
    status: 'SENT',
    issueDate: '2026-10-08T00:00:00.000Z',
    currency: 'AED',
    subtotal: 10,
    taxAmount: 0,
    shipping: 0,
    discount: 0,
    total: 10,
    createdAt: '2026-10-08T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    items: [
      {
        id: 'line-1',
        description: 'Widget',
        quantity: 1,
        unitPrice: 10,
        taxRate: 0,
        amount: 10,
        imageUrl: 'https://cdn.example/widget.jpg',
      },
    ],
  };
}

function org(): Organization {
  return {
    id: 'org_1',
    name: 'Practical Things',
    slug: 'practical-things',
    logo: PNG,
    settings: {
      currency: 'AED',
      timezone: 'Asia/Dubai',
      branding: {
        invoiceSignature: 'https://cdn.example/sign.png',
        invoiceAccent: '#DC2626',
      },
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('embedInvoiceImages', () => {
  it('keeps stored data URLs and drops remote images that cannot be read offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    vi.stubGlobal('caches', { open: vi.fn().mockRejectedValue(new Error('no cache')) });

    const prepared = await embedInvoiceImages(invoice(), org(), 'https://soloflow.test');

    expect(prepared.org.logo).toBe(PNG);
    expect(prepared.org.settings?.branding?.invoiceSignature).toBeUndefined();
    expect(prepared.org.settings?.branding?.invoiceAccent).toBe('#DC2626');
    expect(prepared.invoice.items?.[0].imageUrl).toBeUndefined();
    expect(prepared.invoice.items?.[0].description).toBe('Widget');
  });

  it('inlines a JPEG already in the image cache', async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const blob = new Blob([jpeg], { type: 'image/jpeg' });
    const cache = { match: vi.fn().mockResolvedValue(new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } })) };
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue(cache) });
    vi.stubGlobal('fetch', vi.fn());

    const url = await inlinePrintImage('/uploads/logo.jpg', 'https://soloflow.test');

    expect(url?.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
