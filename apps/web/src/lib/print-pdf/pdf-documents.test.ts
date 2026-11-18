/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import type { Invoice, Organization } from '@/lib/api';
import { buildPdfDocument } from '@/lib/print-pdf/pdf-documents';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const org: Organization = {
  id: 'org_1',
  name: 'Practical Things',
  slug: 'practical-things',
  logo: PNG,
  settings: {
    currency: 'AED',
    timezone: 'Asia/Dubai',
    branding: {
      tagline: 'Made here',
      phone: '+971500000000',
      email: 'hello@practicalthings.store',
      trn: '100000000000003',
      invoiceAccent: '#2563EB',
      invoiceSignature: PNG,
      address: { line1: 'Warehouse 4', city: 'Dubai', country: 'UAE' },
    },
  },
};

const invoice: Invoice = {
  id: 'local-1',
  organizationId: 'org_1',
  number: 'Pending',
  status: 'DRAFT',
  issueDate: '2026-10-08T00:00:00.000Z',
  dueDate: '2026-10-15T00:00:00.000Z',
  currency: 'AED',
  subtotal: 20,
  taxAmount: 1,
  taxRate: 5,
  shipping: 0,
  discount: 0,
  total: 21,
  notes: 'Thank you',
  createdAt: '2026-10-08T00:00:00.000Z',
  updatedAt: '2026-10-08T00:00:00.000Z',
  customer: {
    id: 'cus_1',
    name: 'Ada',
    phone: '+971511111111',
    address: { line1: 'Office 2', city: 'Sharjah' },
  },
  items: [
    {
      id: 'line-1',
      description: 'Brass handle',
      name: 'Handle',
      quantity: 2,
      unitPrice: 10,
      taxRate: 0,
      amount: 20,
    },
  ],
};

describe('buildPdfDocument', () => {
  it('renders Invoice Version 6 as a compact receipt linked to Version 1', async () => {
    const downloadUrl =
      'https://soloflow.practicalthings.store/api/pdf/public-invoice/dummy.signature';
    const buffer = await renderToBuffer(
      buildPdfDocument(
        { type: 'invoices', invoice, org },
        'http://localhost:3000',
        6,
        { wise: PNG, download: PNG },
        downloadUrl,
      ),
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    const source = buffer.toString('latin1');
    expect((source.match(/\/Type \/Page\b/g) ?? []).length).toBe(1);
    expect(source).toContain('soloflow.practicalthings.store');
    expect(source).not.toContain('localhost');
  });

  it('generates a standalone Version 5 PDF with a public HTTPS Version 1 download link', async () => {
    const customerUrl = 'https://soloflow.practicalthings.store/api/pdf/public-invoice/valid_token.sig';
    const buffer = await renderToBuffer(
      buildPdfDocument(
        { type: 'invoices', invoice, org },
        'http://localhost:8080',
        5,
        { wise: PNG, download: PNG },
        customerUrl,
      ),
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    const raw = buffer.toString('latin1');
    // Invoice 1 must be downloaded separately, not appended to the receipt.
    expect((raw.match(/\/Type \/Page\b/g) ?? []).length).toBe(1);
    expect(raw).toContain('soloflow.practicalthings.store');
    expect(raw).not.toContain('localhost');
  });

  it('renders the shared invoice layout to a PDF from local data', async () => {
    const buffer = await renderToBuffer(
      buildPdfDocument({ type: 'invoices', invoice, org }, 'https://soloflow.test'),
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('still renders when a line image or stamp cannot be embedded', async () => {
    const withImages: Invoice = {
      ...invoice,
      items: [
        {
          ...invoice.items![0],
          imageUrl: 'https://example.invalid/shoe.jpg',
        },
        {
          id: 'line-2',
          description: '44 & 43',
          name: 'VVQQ2',
          quantity: 2,
          unitPrice: 79,
          taxRate: 0,
          amount: 158,
          imageUrl: 'data:image/webp;base64,AAAA',
        },
      ],
    };
    const stamped: Organization = {
      ...org,
      settings: {
        ...org.settings!,
        branding: {
          ...org.settings!.branding,
          invoiceSignature: PNG,
          invoiceOffer1: 'https://cdn.example/offer.png',
        },
      },
    };

    const buffer = await renderToBuffer(
      buildPdfDocument(
        { type: 'invoices', invoice: withImages, org: stamped },
        'https://soloflow.test',
      ),
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
