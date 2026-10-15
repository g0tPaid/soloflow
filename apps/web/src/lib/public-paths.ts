const publicPrefixes = [
  '/login',
  '/register',
  '/invite',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/api/auth',
];

/** Crawler files must be reachable without signing in. Auth still protects app routes. */
const publicExactPaths = new Set(['/robots.txt', '/sitemap.xml']);

export function isPublicPath(pathname: string) {
  if (publicExactPaths.has(pathname)) return true;
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}
