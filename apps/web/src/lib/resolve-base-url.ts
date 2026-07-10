import { headers } from 'next/headers';

export async function resolveRequestBaseUrl() {
  const configured = process.env.NEXTAUTH_URL?.replace(/\/$/, '');
  if (configured) return configured;

  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  return '';
}
