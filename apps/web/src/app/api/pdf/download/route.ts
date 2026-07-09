import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const maxDuration = 30;

function pdfResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

async function parsePayload(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { data?: string; filename?: string };
    return { data: body.data, filename: body.filename };
  }

  const form = await request.formData();
  return {
    data: String(form.get('data') ?? ''),
    filename: String(form.get('filename') ?? ''),
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: string | undefined;
  let filename: string | undefined;

  try {
    ({ data, filename } = await parsePayload(request));
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!data || !filename) {
    return NextResponse.json({ error: 'Missing PDF data' }, { status: 400 });
  }

  const safeName = filename.replace(/[^\w.-]/g, '_').slice(0, 120);
  if (!safeName.endsWith('.pdf')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(data, 'base64');
  } catch {
    return NextResponse.json({ error: 'Invalid PDF data' }, { status: 400 });
  }

  if (buffer.length < 100 || buffer.length > 12 * 1024 * 1024) {
    return NextResponse.json({ error: 'PDF size not allowed' }, { status: 400 });
  }

  return pdfResponse(buffer, safeName);
}
