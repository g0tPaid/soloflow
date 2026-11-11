/** Public origin used in robots.txt and the sitemap. Browsers are unaffected. */
export function publicSiteUrl() {
  const configured = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://soloflow.practicalthings.store';
  return 'http://localhost:3000';
}
