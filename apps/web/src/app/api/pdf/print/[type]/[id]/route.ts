import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generatePrintPdf } from '@/lib/generate-print-pdf';

export const runtime = 'nodejs';
export const maxDuration = 120;

const VALID_TYPES = new Set(['invoices', 'receipts', 'expenses']);

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string; id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, id } = await context.params;
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
  }

  const url = new URL(request.url);
  const organizationId = url.searchParams.get('org');
  const filename =
    url.searchParams.get('filename')?.replace(/[^\w.-]/g, '_') ||
    `${type.slice(0, -1)}-${id}.pdf`;

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization is required to generate this PDF.' }, { status: 400 });
  }

  if (!session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pdf = await generatePrintPdf(request, type, id, organizationId);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { error: 'Could not generate PDF. Please try again in a moment.' },
      { status: 500 },
    );
  }
}
