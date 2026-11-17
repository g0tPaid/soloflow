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
