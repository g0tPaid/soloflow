/* SoloFlow app shell. Auth and the API proxy are never used as a fresh online cache. */
const SHELL_CACHE = 'soloflow-shell-v1';
const SESSION_CACHE = 'soloflow-session-v1';
const PRECACHE = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('soloflow-') && key !== SHELL_CACHE && key !== SESSION_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isApiPath(pathname) {
  return pathname.startsWith('/api/v1') || pathname.startsWith('/api/pdf');
}

async function networkFirstSession(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const data = await response.clone().json().catch(() => null);
      const cache = await caches.open(SESSION_CACHE);
      if (data && data.accessToken) {
        await cache.put(request, response.clone());
      } else {
        await cache.delete(request);
      }
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('null', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const finalUrl = new URL(response.url);
      const requestUrl = new URL(request.url);
      if (finalUrl.origin === requestUrl.origin && finalUrl.pathname === requestUrl.pathname) {
        await cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const dashboard = await caches.match('/dashboard');
      if (dashboard) return dashboard;
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
    }
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' && request.method !== 'POST') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isApiPath(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname.startsWith('/api/auth')) {
    if (request.method === 'GET' && url.pathname === '/api/auth/session') {
      event.respondWith(networkFirstSession(request));
      return;
    }
    event.respondWith(
      fetch(request).then(async (response) => {
        if (url.pathname === '/api/auth/signout' && response.ok) {
          await caches.delete(SESSION_CACHE);
        }
        return response;
      }),
    );
    return;
  }

  if (request.method !== 'GET') return;

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico';

  if (isStatic) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response.clone());
          return response;
        } catch {
          return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      }),
    );
    return;
  }

  const isDocument = request.mode === 'navigate' || request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');
  if (isDocument) {
    event.respondWith(networkFirstShell(request));
  }
});
