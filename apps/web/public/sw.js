/* SoloFlow offline app shell.
 * HTML documents are stored separately from Next.js RSC flights. A flight
 * response varies on `rsc`, and saving it under the page URL makes the next
 * offline launch miss the document. Auth and the API are never used as HTML.
 * sw-core.js is inlined below so the installed worker can start with no network.
 */
/**
 * Pure decisions for the SoloFlow service worker.
 * Inlined into sw.js so worker startup does not fetch a second script while offline.
 * Unit tests require this file via module.exports.
 *
 * Navigation HTML and Next.js RSC flights share a URL. The flight response
 * varies on `rsc`, so storing it under the document URL makes a later offline
 * launch miss the HTML shell. Only real HTML is a shell entry, and it is
 * stored at the final pathname (never the pre-redirect path).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.soloflowSw = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function header(headers, name) {
    if (!headers) return '';
    if (typeof headers.get === 'function') return headers.get(name) || '';
    var lower = name.toLowerCase();
    var keys = Object.keys(headers);
    for (var i = 0; i < keys.length; i += 1) {
      if (keys[i].toLowerCase() === lower) return headers[keys[i]] || '';
    }
    return '';
  }

  function pathnameOf(url) {
    var parsed = new URL(url, 'https://soloflow.local');
    return parsed.pathname || '/';
  }

  function isRscRequest(requestLike) {
    if (!requestLike || requestLike.mode === 'navigate') return false;
    var url = new URL(requestLike.url, 'https://soloflow.local');
    if (header(requestLike.headers, 'RSC') === '1') return true;
    if (header(requestLike.headers, 'Next-Router-Prefetch') === '1') return true;
    if (header(requestLike.headers, 'Next-Router-Segment-Prefetch')) return true;
    return url.searchParams.has('_rsc');
  }

  function isShellRequest(requestLike) {
    if (!requestLike || requestLike.method !== 'GET') return false;
    if (isRscRequest(requestLike)) return false;
    if (requestLike.mode === 'navigate') return true;
    return header(requestLike.headers, 'Accept').indexOf('text/html') !== -1;
  }

  /**
   * Pathnames that may receive this response body.
   * A redirect from /dashboard to /login stores /login only, so the login
   * document cannot be replayed as the dashboard shell.
   */
  function shellStoragePaths(requestUrl, responseUrl, contentType, isRsc) {
    if (isRsc) return [];
    if (!contentType || String(contentType).toLowerCase().indexOf('text/html') === -1) return [];
    return [pathnameOf(responseUrl || requestUrl)];
  }

  /**
   * What to render for an offline navigation.
   * Exact visited paths win. The origin root (Capacitor cold start) redirects
   * to a cached /dashboard. Anything else falls through to the offline page
   * instead of pretending another route's HTML is this one.
   */
  function offlineShellAction(requestPath, cachedPaths) {
    var cached = {};
    var list = cachedPaths || [];
    for (var i = 0; i < list.length; i += 1) cached[list[i]] = true;
    if (cached[requestPath]) return { type: 'document', path: requestPath };
    if ((requestPath === '/' || requestPath === '') && cached['/dashboard']) {
      return { type: 'redirect', path: '/dashboard' };
    }
    if (cached['/offline.html']) return { type: 'document', path: '/offline.html' };
    return { type: 'offline-page' };
  }

  function staticAssetUrls(html) {
    var urls = [];
    var seen = {};
    var re = /(?:src|href)=["']([^"']+)["']/g;
    var match;
    var source = String(html || '');
    while ((match = re.exec(source))) {
      var raw = match[1];
      if (raw.indexOf('/_next/static/') === -1 && raw.indexOf('/icons/') !== 0) continue;
      var path = raw.split('#')[0].split('?')[0];
      if (!seen[path]) {
        seen[path] = true;
        urls.push(path);
      }
    }
    return urls;
  }

  return {
    isRscRequest: isRscRequest,
    isShellRequest: isShellRequest,
    shellStoragePaths: shellStoragePaths,
    offlineShellAction: offlineShellAction,
    staticAssetUrls: staticAssetUrls,
    /** Main-frame fallbacks must be 200. Capacitor treats 503 as a dead WebView. */
    NAVIGATION_FALLBACK_STATUS: 200,
  };
});

const SHELL_CACHE = 'soloflow-shell-v2';
const SESSION_CACHE = 'soloflow-session-v1';
const IMAGE_CACHE = 'soloflow-images';
const PRECACHE = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
const SHELL_NETWORK_TIMEOUT_MS = 2500;
const core = self.soloflowSw;

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
            .filter(
              (key) =>
                key.startsWith('soloflow-') &&
                key !== SHELL_CACHE &&
                key !== SESSION_CACHE &&
                key !== IMAGE_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isApiPath(pathname) {
  return pathname.startsWith('/api/v1') || pathname.startsWith('/api/pdf');
}

async function clearUserShell() {
  await caches.delete(SESSION_CACHE);
  const cache = await caches.open(SHELL_CACHE);
  const keys = await cache.keys();
  await Promise.all(
    keys.map((request) => {
      const path = new URL(request.url).pathname;
      if (
        path === '/offline.html' ||
        path === '/manifest.webmanifest' ||
        path.startsWith('/icons/') ||
        path.startsWith('/_next/static/')
      ) {
        return undefined;
      }
      return cache.delete(request);
    }),
  );
}

async function networkFirstSession(request) {
  const cache = await caches.open(SESSION_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const data = await response.clone().json().catch(() => null);
      if (data && data.accessToken) {
        await cache
          .put(
            '/api/auth/session',
            new Response(JSON.stringify(data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
          .catch(() => undefined);
      } else {
        await cache.delete('/api/auth/session').catch(() => undefined);
      }
    }
    return response;
  } catch {
    const cached = await cache.match('/api/auth/session', { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    return new Response('null', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function shellHeaders(response, path) {
  const headers = new Headers(response.headers);
  headers.delete('Vary');
  headers.delete('Set-Cookie');
  headers.delete('Content-Encoding');
  headers.delete('Content-Length');
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('X-Soloflow-Shell', path);
  return headers;
}

async function precacheStatic(html) {
  const urls = core.staticAssetUrls(html);
  if (!urls.length) return;
  const cache = await caches.open(SHELL_CACHE);
  await Promise.all(
    urls.map(async (path) => {
      try {
        const hit = await cache.match(path, { ignoreSearch: true, ignoreVary: true });
        if (hit) return;
        const response = await fetch(path);
        if (!response.ok) return;
        const headers = new Headers(response.headers);
        headers.delete('Vary');
        headers.delete('Content-Encoding');
        headers.delete('Content-Length');
        const body = await response.arrayBuffer();
        await cache.put(path, new Response(body, { status: 200, headers }));
      } catch {
        // A missing chunk must not fail the navigation that discovered it.
      }
    }),
  );
}

async function storeShell(cache, request, response) {
  try {
    if (!response || !response.ok) return;
    if (response.type !== 'basic' && response.type !== 'default') return;
    const paths = core.shellStoragePaths(
      request.url,
      response.url || request.url,
      response.headers.get('content-type') || '',
      core.isRscRequest(request),
    );
    if (!paths.length) return;
    const html = await response.clone().text();
    if (!/<html[\s>]/i.test(html) && !/<!doctype html/i.test(html)) return;
    await Promise.all(
      paths.map((path) => cache.put(path, new Response(html, { status: 200, headers: shellHeaders(response, path) }))),
    );
    void precacheStatic(html);
  } catch {
    // Keeping the live response matters more than this cache write.
  }
}

async function matchShell(cache, path) {
  if (!path) return undefined;
  return cache.match(path, { ignoreSearch: true, ignoreVary: true });
}

async function cachedShellPaths(cache) {
  const keys = await cache.keys();
  return keys.map((request) => new URL(request.url).pathname);
}

async function offlineNavigation(cache, path) {
  const action = core.offlineShellAction(path, await cachedShellPaths(cache));
  if (action.type === 'redirect' && action.path) {
    return Response.redirect(new URL(action.path, self.location.origin).href, 302);
  }
  if (action.type === 'document' && action.path) {
    const hit = await matchShell(cache, action.path);
    if (hit) return hit;
  }
  const offline = await matchShell(cache, '/offline.html');
  if (offline) return offline;
  return new Response(
    '<!doctype html><title>SoloFlow</title><p>SoloFlow is offline. Open it once while online, then try this page again.</p>',
    {
      status: core.NAVIGATION_FALLBACK_STATUS,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}

async function handleShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  const path = new URL(request.url).pathname || '/';
  const cached = await matchShell(cache, path);
  const offline = self.navigator.onLine === false;

  const fromNetwork = async () => {
    const response = await fetch(request);
    await storeShell(cache, request, response);
    if (request.mode === 'navigate' && response.redirected && response.ok) {
      const finalUrl = new URL(response.url);
      if (finalUrl.origin === new URL(request.url).origin) {
        return Response.redirect(finalUrl.href, 302);
      }
    }
    return response;
  };

  if (offline) {
    if (cached && path !== '/') return cached;
    return offlineNavigation(cache, path);
  }

  if (!cached || path === '/') {
    try {
      return await fromNetwork();
    } catch {
      return offlineNavigation(cache, path);
    }
  }

  let settled = false;
  const network = fromNetwork()
    .catch(() => cached)
    .then((response) => {
      settled = true;
      return response;
    });
  const timeout = new Promise((resolve) => {
    setTimeout(() => {
      if (!settled) resolve(cached);
    }, SHELL_NETWORK_TIMEOUT_MS);
  });
  return Promise.race([network, timeout]);
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
          await clearUserShell();
        }
        return response;
      }),
    );
    return;
  }

  if (request.method !== 'GET') return;
  if (core.isRscRequest(request)) return;

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico';

  if (isStatic) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            try {
              const headers = new Headers(response.headers);
              headers.delete('Vary');
              headers.delete('Content-Encoding');
              headers.delete('Content-Length');
              const body = await response.clone().arrayBuffer();
              await cache.put(request, new Response(body, { status: 200, headers }));
            } catch {
              // A cache write must not turn a live script into a failed load.
            }
          }
          return response;
        } catch {
          return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      }),
    );
    return;
  }

  if (core.isShellRequest(request)) {
    event.respondWith(handleShell(request));
  }
});
