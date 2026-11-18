import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiFetch } from '@/lib/api';
import { publicInvoiceDownloadUrl } from '@/lib/public-invoice-download-url';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.accessToken || !session.user?.id) {
    return NextResponse.json({ error: 'Sign in to create an invoice link' }, { status: 401 });
  }
  const organizationId = new URL(request.url).searchParams.get('org');
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization required' }, { status: 400 });
  }
  const { id } = await context.params;
  try {
    const { token } = await apiFetch<{ token: string }>(
      `/invoices/${encodeURIComponent(id)}/public-download-token`,
      { token: session.accessToken, organizationId },
    );
    const url = publicInvoiceDownloadUrl(token);
    return NextResponse.json({ url }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Could not create a public invoice download link' }, { status: 502 });
  }
}
