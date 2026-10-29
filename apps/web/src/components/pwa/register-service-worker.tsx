'use client';

import { useEffect } from 'react';

function warmOfflinePdf() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  void import('@/lib/print-pdf/render-pdf-client').catch(() => undefined);
}

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      warmOfflinePdf();
      return;
    }

    // Register first so the PDF chunk fetch is intercepted and stored for offline use.
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(() => navigator.serviceWorker.ready)
      .then(() => warmOfflinePdf())
      .catch(() => warmOfflinePdf());
  }, []);

  return null;
}
