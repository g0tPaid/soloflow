import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Invoice, Organization } from '@/lib/api';
import { buildPdfDocument } from '@/lib/print-pdf/pdf-documents';
import { isolateInvoiceButton } from '@/lib/print-pdf/isolate-invoice-button';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Synthetic, public preview used exclusively to check layout. No account data.
export async function GET() {
  const org: Organization = {
    id: 'demo-org',
    name: 'Example International Trading Co Ltd',
    slug: 'layout-preview',
    settings: {
      currency: 'USD',
      timezone: 'UTC',
      branding: {
        address: { line1: '79 Sample Avenue', city: 'Xiamen', region: 'Fujian', postcode: '67300001', country: 'China' },
        phone: '18059262730',
        email: 'info@example.com',
      },
    },
  };
  const invoice: Invoice = {
    id: 'layout-preview',
    organizationId: 'demo-org',
    number: 'INV-SAMPLE/CANADA/01',
    status: 'DRAFT',
    issueDate: '2026-11-18T00:00:00.000Z',
    currency: 'USD',
    subtotal: 58,
    shipping: 19,
    taxRate: 0,
    taxAmount: 0,
    discount: 0,
    total: 77,
    createdAt: '2026-11-18T00:00:00.000Z',
    updatedAt: '2026-11-18T00:00:00.000Z',
    customer: { id: 'demo-customer', name: 'Sample Customer', address: { line1: '534 Example Clarke Way', city: 'Oakville', region: 'Ontario', postcode: 'L6M0N9', country: 'Canada' } },
    items: [{ id: 'demo-item', name: 'AJ45', description: '11', quantity: 1, unitPrice: 58, taxRate: 0, amount: 58 }],
  };

  const embed = async (filename: string) => {
    const bytes = await readFile(path.join(process.cwd(), 'public', filename));
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cropped = isolateInvoiceButton(data, info.width, info.height);
    const result = await sharp(cropped.pixels, {
      raw: { width: cropped.width, height: cropped.height, channels: 4 },
    }).png().toBuffer();
    return 'data:image/png;base64,' + result.toString('base64');
  };
  try {
    const [wise, download] = await Promise.all([
      embed('Pay with Wise Button.png'),
      embed('Sourcing Center Download Invoice Button.png'),
    ]);
    const pdf = await renderToBuffer(buildPdfDocument(
      { type: 'invoices', invoice, org },
      'https://soloflow.practicalthings.store',
      6,
      { wise, download },
      'https://soloflow.practicalthings.store/api/pdf/public-invoice/demo.signature',
    ));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="invoice-v6-layout-preview.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Invoice 6 preview render failed', error);
    return NextResponse.json({ error: 'Unable to render layout preview' }, { status: 500 });
  }
}
