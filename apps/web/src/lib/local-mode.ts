/**
 * Desktop / local auto-login only.
 * Production builds (Railway, `next start`) always treat this as off, even if
 * NEXT_PUBLIC_LOCAL_MODE=true is still set on the service — staff must use
 * their own email and password.
 */
export const LOCAL_MODE =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';
