/** Routes warmed into the navigation cache after a successful online visit. */
export const SHELL_ROUTES = ['/dashboard', '/invoices', '/login'] as const;

/**
 * Offline clicks should load a full document so the service worker can serve
 * cached HTML. A Next.js client transition asks for an RSC flight instead,
 * and that flight is not the app shell.
 */
export function offlineDocumentUrl(
  href: string,
  currentHref: string,
  online: boolean,
): string | null {
  if (online) return null;
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return null;
  }

  let next: URL;
  let current: URL;
  try {
    next = new URL(href, currentHref);
    current = new URL(currentHref);
  } catch {
    return null;
  }

  if (next.origin !== current.origin) return null;
  if (next.pathname === current.pathname && next.search === current.search) return null;
  return next.href;
}
