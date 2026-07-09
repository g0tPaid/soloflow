import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getServerApiBaseUrl } from '@/lib/server-api-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Please sign in again.' }, { status: 401 });
  }

  const { id } = await context.params;
  const organizationId = request.headers.get('x-organization-id') ?? id;

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ message: 'Could not read request body' }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ message: 'Empty request body' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getServerApiBaseUrl()}/organizations/${id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.accessToken}`,
        'x-organization-id': organizationId,
      },
      body,
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
