import { NextResponse } from 'next/server';
import { takePdf } from '@/lib/pdf-stash';

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const entry = takePdf(token);

  if (!entry) {
    return NextResponse.json({ error: 'Download link expired' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(entry.data), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${entry.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
