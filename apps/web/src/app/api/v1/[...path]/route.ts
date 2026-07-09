import { NextRequest, NextResponse } from 'next/server';

function getApiOrigin(): string | null {
  const direct = process.env.API_URL?.replace(/\/$/, '');
  if (direct) return direct;

  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (publicUrl?.endsWith('/api/v1')) {
    return publicUrl.slice(0, -'/api/v1'.length);
  }
  return publicUrl ?? null;
}

async function proxyRequest(request: NextRequest, path: string[]) {
  const origin = getApiOrigin();
  if (!origin) {
    return NextResponse.json(
      { message: 'API_URL is not configured on the web service.' },
      { status: 503 },
    );
  }

  const target = `${origin}/api/v1/${path.join('/')}${request.nextUrl.search}`;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);
  const organizationId = request.headers.get('x-organization-id');
  if (organizationId) headers.set('x-organization-id', organizationId);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  try {
    const upstream = await fetch(target, init);
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Cannot reach SoloFlow API. Check that the api service is online on Railway.' },
      { status: 502 },
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
