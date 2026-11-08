/* SoloFlow offline app shell.
 * HTML documents are stored separately from Next.js RSC flights. A flight
 * response varies on `rsc`, and saving it under the page URL makes the next
 * offline launch miss the document. Private HTML is stored per signed-in user
 * so one account cannot open another's cached pages. Auth and the API are
 * never used as HTML. sw-core.js is inlined below so the worker can start offline.
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

  var PUBLIC_SHELL_PREFIXES = [
    '/login',
    '/register',
    '/invite',
    '/forgot-password',
    '/reset-password',
    '/privacy',
  ];

  function sessionOwnerId(session) {
    if (!session || typeof session !== 'object') return '';
    var user = session.user;
    if (!user || typeof user.id !== 'string') return '';
    var id = user.id.trim();
    if (!id || id.length > 128 || !/^[A-Za-z0-9_-]+$/.test(id)) return '';
    return id;
  }

  function isPublicShellPath(path) {
    if (path === '/offline.html') return true;
    for (var i = 0; i < PUBLIC_SHELL_PREFIXES.length; i += 1) {
      var prefix = PUBLIC_SHELL_PREFIXES[i];
      if (path === prefix || path.indexOf(prefix + '/') === 0) return true;
    }
    return false;
  }

  function userShellCacheName(ownerId) {
    return ownerId ? 'soloflow-user-shell-v2:' + ownerId : '';
  }

  /**
   * Private HTML belongs to one signed-in user. Public pages (login, offline)
   * can be shared. A missing user id means do not store the private document.
   */
  function shellStoreDecision(path, ownerId) {
    if (isPublicShellPath(path)) return { store: true, scope: 'public' };
    if (!ownerId) return { store: false, scope: 'none' };
    return { store: true, scope: 'user', ownerId: ownerId };
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
    sessionOwnerId: sessionOwnerId,
    isPublicShellPath: isPublicShellPath,
    userShellCacheName: userShellCacheName,
    shellStoreDecision: shellStoreDecision,
    /** Main-frame fallbacks must be 200. Capacitor treats 503 as a dead WebView. */
    NAVIGATION_FALLBACK_STATUS: 200,
  };
});


const SHELL_CACHE = 'soloflow-shell-v2';
const SESSION_CACHE = 'soloflow-session-v1';
const IMAGE_CACHE = 'soloflow-images';
const USER_SHELL_PREFIX = 'soloflow-user-shell-v2:';
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
                key !== IMAGE_CACHE &&
                !key.startsWith(USER_SHELL_PREFIX),
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

async function userShellCaches() {
  const keys = await caches.keys();
  return keys.filter((key) => key.startsWith(USER_SHELL_PREFIX));
}

async function clearUserShell() {
  await caches.delete(SESSION_CACHE);
  const names = await userShellCaches();
  await Promise.all(names.map((name) => caches.delete(name)));
  const cache = await caches.open(SHELL_CACHE);
  const keys = await cache.keys();
  await Promise.all(
    keys.map((request) => {
      const path = new URL(request.url).pathname;
      if (
        path === '/offline.html' ||
        path === '/manifest.webmanifest' ||
        path.startsWith('/icons/') ||
        path.startsWith('/_next/static/') ||
        core.isPublicShellPath(path)
      ) {
        return undefined;
      }
      return cache.delete(request);
    }),
  );
}

async function clearOtherUserShells(ownerId) {
  const keep = core.userShellCacheName(ownerId);
  const names = await userShellCaches();
  await Promise.all(names.filter((name) => name !== keep).map((name) => caches.delete(name)));
}

async function readCachedSession() {
  const cache = await caches.open(SESSION_CACHE);
  const cached = await cache.match('/api/auth/session', { ignoreSearch: true, ignoreVary: true });
  if (!cached) return null;
  return cached.clone().json().catch(() => null);
}

async function currentOwnerId() {
  return core.sessionOwnerId(await readCachedSession());
}

async function networkFirstSession(request) {
  const cache = await caches.open(SESSION_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const data = await response.clone().json().catch(() => null);
      const ownerId = core.sessionOwnerId(data);
      if (data && data.accessToken && ownerId) {
        const previous = core.sessionOwnerId(await readCachedSession());
        if (previous && previous !== ownerId) await clearOtherUserShells(ownerId);
        else await clearOtherUserShells(ownerId);
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
        await clearUserShell();
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

async function cacheForDecision(decision) {
  if (decision.scope === 'user') return caches.open(core.userShellCacheName(decision.ownerId));
  return caches.open(SHELL_CACHE);
}

async function storeShell(request, response) {
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
    const ownerId = await currentOwnerId();
    await Promise.all(
      paths.map(async (path) => {
        const decision = core.shellStoreDecision(path, ownerId);
        if (!decision.store) return;
        const cache = await cacheForDecision(decision);
        await cache.put(path, new Response(html, { status: 200, headers: shellHeaders(response, path) }));
      }),
    );
    void precacheStatic(html);
  } catch {
    // Keeping the live response matters more than this cache write.
  }
}

async function matchShell(cache, path) {
  if (!cache || !path) return undefined;
  return cache.match(path, { ignoreSearch: true, ignoreVary: true });
}

async function allowedShellPaths(ownerId) {
  const shared = await caches.open(SHELL_CACHE);
  const sharedKeys = await shared.keys();
  const paths = sharedKeys
    .map((request) => new URL(request.url).pathname)
    .filter((path) => core.isPublicShellPath(path) || path === '/offline.html');
  if (!ownerId) return paths;
  const userCache = await caches.open(core.userShellCacheName(ownerId));
  const userKeys = await userCache.keys();
  return paths.concat(userKeys.map((request) => new URL(request.url).pathname));
}

async function offlineNavigation(path) {
  const ownerId = await currentOwnerId();
  const action = core.offlineShellAction(path, await allowedShellPaths(ownerId));
  if (action.type === 'redirect' && action.path) {
    return Response.redirect(new URL(action.path, self.location.origin).href, 302);
  }
  if (action.type === 'document' && action.path) {
    const decision = core.shellStoreDecision(action.path, ownerId);
    const cache = decision.store ? await cacheForDecision(decision.scope === 'user' ? decision : { scope: 'public' }) : null;
    const publicCache = await caches.open(SHELL_CACHE);
    const hit =
      (decision.scope === 'user' ? await matchShell(cache, action.path) : await matchShell(publicCache, action.path)) ||
      (action.path === '/offline.html' ? await matchShell(publicCache, '/offline.html') : undefined);
    if (hit) return hit;
  }
  const offline = await matchShell(await caches.open(SHELL_CACHE), '/offline.html');
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
  const path = new URL(request.url).pathname || '/';
  const ownerId = await currentOwnerId();
  const decision = core.shellStoreDecision(path, ownerId);
  const publicCache = await caches.open(SHELL_CACHE);
  const userCache =
    decision.scope === 'user' ? await caches.open(core.userShellCacheName(ownerId)) : null;
  const cached =
    decision.scope === 'user'
      ? await matchShell(userCache, path)
      : decision.scope === 'public'
        ? await matchShell(publicCache, path)
        : undefined;
  const offline = self.navigator.onLine === false;

  const fromNetwork = async () => {
    const response = await fetch(request);
    await storeShell(request, response);
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
    return offlineNavigation(path);
  }

  if (!cached || path === '/') {
    try {
      return await fromNetwork();
    } catch {
      return offlineNavigation(path);
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
