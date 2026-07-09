import { NextResponse } from 'next/server';
import { getServerApiBaseUrl } from '@/lib/server-api-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getServerApiBaseUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      {
        message:
          'Cannot reach SoloFlow API. Set API_URL on the Railway web service to your api URL, then redeploy.',
      },
      { status: 502 },
    );
  }
}
