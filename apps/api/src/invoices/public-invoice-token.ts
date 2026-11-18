import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_PURPOSE = 'soloflow:public-invoice-download:v1';
const TOKEN_VALID_FOR_SECONDS = 365 * 24 * 60 * 60;

function signingSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || (process.env.NODE_ENV === 'production' && secret === 'dev-secret')) {
    throw new Error('JWT_SECRET must be configured for public invoice links');
  }
  return secret;
}

function signature(payload: string): Buffer {
  return createHmac('sha256', signingSecret())
    .update(TOKEN_PURPOSE).update(':').update(payload).digest();
}

export function createPublicInvoiceToken(organizationId: string, invoiceId: string): string {
  const payload = Buffer.from(JSON.stringify({
    o: organizationId,
    i: invoiceId,
    e: Math.floor(Date.now() / 1000) + TOKEN_VALID_FOR_SECONDS,
  })).toString('base64url');
  return `${payload}.${signature(payload).toString('base64url')}`;
}

export function verifyPublicInvoiceToken(token: string): { organizationId: string; invoiceId: string } | null {
  try {
    if (token.length > 1500 || !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(token)) return null;
    const [payload, mac] = token.split('.');
    const expected = signature(payload);
    const received = Buffer.from(mac, 'base64url');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    const fields = parsed as Record<string, unknown>;
    if (typeof fields.o !== 'string' || typeof fields.i !== 'string' ||
      typeof fields.e !== 'number' || fields.e <= Date.now() / 1000 ||
      fields.e > Date.now() / 1000 + TOKEN_VALID_FOR_SECONDS + 60 ||
      !fields.o || !fields.i) return null;
    return { organizationId: fields.o, invoiceId: fields.i };
  } catch {
    return null;
  }
}
