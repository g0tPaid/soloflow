import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import type { Invoice, Organization } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { buildPdfDocument } from '@/lib/print-pdf/pdf-documents';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token || token.length > 1500 || !/^[a-zA-Z0-9_.-]+$/.test(token)) {
    return NextResponse.json({ error: 'Invalid invoice link' }, { status: 404 });
  }

  try {
    // The API verifies a signed, expiring, invoice-scoped capability token and
    // returns only the customer-facing fields. This route needs no login.
    const { invoice, org } = await apiFetch<{ invoice: Invoice; org: Organization }>(
      `/public/invoices/download/${encodeURIComponent(token)}`,
    );
    const baseUrl = new URL(request.url).origin;
    const pdf = await renderToBuffer(buildPdfDocument(
      { type: 'invoices', invoice, org },
      baseUrl,
    ));
    const filename = invoice.number.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100) || 'invoice';

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}-invoice.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'This invoice download link is unavailable or has expired.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
