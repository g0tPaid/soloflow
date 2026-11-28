import { createHash, createHmac, randomBytes } from 'node:crypto';

export function hashPortalToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenForNonce(nonce: string) {
  return createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
    .update('soloflow-partner-portal:' + nonce).digest('base64url');
}

export function newPortalLink() {
  const linkNonce = randomBytes(32).toString('base64url');
  const token = tokenForNonce(linkNonce);
  return { token, linkNonce, tokenHash: hashPortalToken(token) };
}

/** 128-bit alias derived from the stored digest; no extra bearer secret is persisted. */
export function shortCodeForHash(hash: string) {
  return Buffer.from(hash.slice(0, 32), 'hex').toString('base64url');
}
export function hashPrefixForShortCode(code: string): string | null {
  if (!/^[A-Za-z0-9_-]{22}$/.test(code)) return null;
  const bytes = Buffer.from(code, 'base64url');
  return bytes.length === 16 && bytes.toString('base64url') === code ? bytes.toString('hex') : null;
}
