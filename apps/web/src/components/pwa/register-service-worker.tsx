'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { offlineDocumentUrl, SHELL_ROUTES } from '@/lib/pwa/offline-navigation';

function warmOfflinePdf() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  void import('@/lib/print-pdf/render-pdf-client').catch(() => undefined);
}

function warmDocument(path: string) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (!path.startsWith('/') || path.startsWith('/api') || path.startsWith('/_next')) return;
  void fetch(path, {
    credentials: 'include',
    cache: 'reload',
    headers: { Accept: 'text/html' },
  }).catch(() => undefined);
}

/** Pull HTML (and, via the service worker, its scripts) into the shell cache. */
function warmAppShell() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  void fetch('/api/auth/session', { credentials: 'include', cache: 'reload' }).catch(() => undefined);
  for (const path of SHELL_ROUTES) warmDocument(path);
}

function installOfflineDocumentNavigation() {
  function onClick(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;
    const frame = anchor.getAttribute('target');
    if (frame && frame !== '_self') return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    const next = offlineDocumentUrl(href, window.location.href, navigator.onLine !== false);
    if (!next) return;
    event.preventDefault();
    window.location.assign(next);
  }

  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}

function warmWhenControlled() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(() => warmAppShell()).catch(() => undefined);
}

export function RegisterServiceWorker() {
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    const removeOfflineNav = installOfflineDocumentNavigation();

    if (!('serviceWorker' in navigator)) {
      warmOfflinePdf();
      return removeOfflineNav;
    }

    // Register first so shell and PDF fetches are intercepted and stored.
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        warmAppShell();
        warmOfflinePdf();
      })
      .catch(() => warmOfflinePdf());

    window.addEventListener('online', warmWhenControlled);
    return () => {
      window.removeEventListener('online', warmWhenControlled);
      removeOfflineNav();
    };
  }, []);

  // Login often client-navigates into the app, so the open page is never
  // requested as HTML until we fetch it on purpose once the session exists.
  useEffect(() => {
    if (status !== 'authenticated') return;
    warmWhenControlled();
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated' || !pathname) return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(() => warmDocument(pathname)).catch(() => undefined);
  }, [status, pathname]);

  return null;
}
