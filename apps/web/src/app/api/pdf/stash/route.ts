import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stashPdf } from '@/lib/pdf-stash';

export const maxDuration = 30;

type Body = {
  data?: string;
  filename?: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { data, filename } = body;
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

  const token = stashPdf(buffer, safeName);
  const origin = new URL(request.url).origin;
  const downloadUrl = `${origin}/api/pdf/file/${token}`;

  return NextResponse.json({ token, downloadUrl });
}
