import { createRequire } from 'node:module';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { offlineDocumentUrl } from './offline-navigation';

const require = createRequire(import.meta.url);
const core = require(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../public/sw-core.js'),
) as {
  isRscRequest: (request: { url: string; method?: string; mode?: string; headers?: Headers }) => boolean;
  isShellRequest: (request: { url: string; method?: string; mode?: string; headers?: Headers }) => boolean;
  shellStoragePaths: (
    requestUrl: string,
    responseUrl: string,
    contentType: string,
    isRsc: boolean,
  ) => string[];
  offlineShellAction: (
    requestPath: string,
    cachedPaths: string[],
  ) => { type: string; path?: string };
  staticAssetUrls: (html: string) => string[];
  NAVIGATION_FALLBACK_STATUS: number;
};

const origin = 'https://soloflow.practicalthings.store';

describe('service worker shell decisions', () => {
  it('treats a browser navigation as the app shell and an RSC flight as not', () => {
    expect(
      core.isShellRequest({
        url: `${origin}/dashboard`,
        method: 'GET',
        mode: 'navigate',
        headers: new Headers({ Accept: 'text/html' }),
      }),
    ).toBe(true);

    expect(
      core.isRscRequest({
        url: `${origin}/dashboard?_rsc=abc`,
        method: 'GET',
        mode: 'cors',
        headers: new Headers({ RSC: '1', Accept: 'text/html' }),
      }),
    ).toBe(true);

    expect(
      core.isShellRequest({
        url: `${origin}/dashboard`,
        method: 'GET',
        mode: 'cors',
        headers: new Headers({ RSC: '1', Accept: 'text/html' }),
      }),
    ).toBe(false);
  });

  it('stores HTML at the final pathname and never stores an RSC body as the document', () => {
    expect(
      core.shellStoragePaths(`${origin}/dashboard`, `${origin}/dashboard`, 'text/html; charset=utf-8', false),
    ).toEqual(['/dashboard']);

    expect(
      core.shellStoragePaths(
        `${origin}/dashboard`,
        `${origin}/login?callbackUrl=%2Fdashboard`,
        'text/html; charset=utf-8',
        false,
      ),
    ).toEqual(['/login']);

    expect(
      core.shellStoragePaths(`${origin}/dashboard`, `${origin}/dashboard`, 'text/x-component', true),
    ).toEqual([]);
  });

  it('opens a visited route offline and sends the origin root to the cached dashboard', () => {
    const cached = ['/dashboard', '/invoices', '/offline.html', '/icons/icon-192.png'];

    expect(core.offlineShellAction('/dashboard', cached)).toEqual({
      type: 'document',
      path: '/dashboard',
    });
    expect(core.offlineShellAction('/invoices', cached)).toEqual({
      type: 'document',
      path: '/invoices',
    });
    expect(core.offlineShellAction('/', cached)).toEqual({ type: 'redirect', path: '/dashboard' });
    expect(core.offlineShellAction('/customers', cached)).toEqual({
      type: 'document',
      path: '/offline.html',
    });
    expect(core.offlineShellAction('/dashboard', [])).toEqual({ type: 'offline-page' });
  });

  it('answers navigation fallbacks with HTTP 200 so the Android WebView keeps the document', () => {
    expect(core.NAVIGATION_FALLBACK_STATUS).toBe(200);
  });

  it('collects the static chunks a cached document needs in order to boot', () => {
    const html = `
      <link rel="stylesheet" href="/_next/static/css/app.css?v=1" />
      <script src="/_next/static/chunks/main.js"></script>
      <img src="/icons/icon-192.png" />
      <script src="https://example.com/evil.js"></script>
    `;
    expect(core.staticAssetUrls(html)).toEqual([
      '/_next/static/css/app.css',
      '/_next/static/chunks/main.js',
      '/icons/icon-192.png',
    ]);
  });

  it('keeps the worker wired to those decisions and does not fail navigations with 503', () => {
    const sw = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../public/sw.js'), 'utf8');
    const coreSource = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../public/sw-core.js'),
      'utf8',
    );
    expect(sw).toContain(coreSource.trim());
    expect(sw).not.toContain('importScripts(');
    expect(sw).toContain('offlineShellAction');
    expect(sw).toContain('shellStoragePaths');
    expect(sw).toContain('status: core.NAVIGATION_FALLBACK_STATUS');
    const navigationFallback = sw.slice(
      sw.indexOf('async function offlineNavigation'),
      sw.indexOf('async function handleShell'),
    );
    expect(navigationFallback).not.toContain('503');
  });
});

describe('offline document navigation', () => {
  const here = 'https://soloflow.practicalthings.store/dashboard';

  it('turns an in-app link into a full document load while offline', () => {
    expect(offlineDocumentUrl('/invoices', here, false)).toBe(
      'https://soloflow.practicalthings.store/invoices',
    );
    expect(offlineDocumentUrl('/invoices?status=open', here, false)).toBe(
      'https://soloflow.practicalthings.store/invoices?status=open',
    );
  });

  it('leaves online clicks, same-page links, and other sites to the client router', () => {
    expect(offlineDocumentUrl('/invoices', here, true)).toBeNull();
    expect(offlineDocumentUrl('/dashboard', here, false)).toBeNull();
    expect(offlineDocumentUrl('https://example.com/invoices', here, false)).toBeNull();
    expect(offlineDocumentUrl('#metrics', here, false)).toBeNull();
  });
});
