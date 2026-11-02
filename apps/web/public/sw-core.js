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
