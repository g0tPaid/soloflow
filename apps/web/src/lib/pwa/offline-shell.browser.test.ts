// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const swSource = readFileSync(path.join(root, 'public/sw.js'));
const offlineHtml = readFileSync(path.join(root, 'public/offline.html'));

function token(expSeconds: number) {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url');
  return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}

type SessionUser = { id: string; accessToken: string } | null;

function startFixture() {
  let session: SessionUser = null;
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname === '/test/login') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString() || '{}') as { id?: string; exp?: number };
        const exp = body.exp ?? Math.floor(Date.now() / 1000) + 3600;
        session = { id: body.id || 'user_a', accessToken: token(exp) };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
      });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/signout') {
      session = null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
      return;
    }
    if (url.pathname === '/api/auth/session') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session ? { user: { id: session.id }, accessToken: session.accessToken } : null));
      return;
    }
    if (url.pathname === '/sw.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
      res.end(swSource);
      return;
    }
    if (url.pathname === '/offline.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(offlineHtml);
      return;
    }
    if (url.pathname === '/manifest.webmanifest') {
      res.writeHead(200, { 'Content-Type': 'application/manifest+json' });
      res.end('{"name":"SoloFlow"}');
      return;
    }
    if (url.pathname === '/icons/icon-192.png' || url.pathname === '/icons/icon-512.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
      return;
    }
    if (url.pathname === '/_next/static/chunks/app.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end('self.__soloflowChunk = 1;');
      return;
    }
    if (req.headers.rsc === '1') {
      res.writeHead(200, { 'Content-Type': 'text/x-component' });
      res.end('0:["rsc"]');
      return;
    }
    if (url.pathname === '/dashboard' || url.pathname === '/invoices' || url.pathname === '/harness') {
      const who = session?.id ?? 'signed-out';
      const title = url.pathname === '/harness' ? 'Harness' : `${url.pathname.slice(1)} ${who}`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html><head><title>${title}</title><script src="/_next/static/chunks/app.js"></script></head><body><h1>${title}</h1></body></html>`);
      return;
    }
    res.writeHead(404);
    res.end('missing');
  });
  return new Promise<{ server: Server; origin: string }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('no port');
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

class Cdp {
  private next = 1;
  private pending = new Map<number, (value: unknown) => void>();
  private waiters = new Map<string, Array<(value: unknown) => void>>();
  constructor(private socket: WebSocket) {
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; method?: string; result?: unknown; params?: unknown };
      if (message.id != null && this.pending.has(message.id)) {
        this.pending.get(message.id)?.(message.result);
        this.pending.delete(message.id);
      }
      if (message.method && this.waiters.has(message.method)) {
        const queued = this.waiters.get(message.method) ?? [];
        this.waiters.delete(message.method);
        for (const resolve of queued) resolve(message.params);
      }
    });
  }
  send(method: string, params?: unknown) {
    const id = this.next++;
    const result = new Promise((resolve) => this.pending.set(id, resolve));
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }
  waitFor(method: string) {
    return new Promise((resolve) => {
      const queued = this.waiters.get(method) ?? [];
      queued.push(resolve);
      this.waiters.set(method, queued);
    });
  }
}

describe('offline app shell in Chrome', () => {
  let server: Server;
  let origin: string;
  let chrome: ChildProcess;
  let profile: string;
  let cdp: Cdp;

  beforeAll(async () => {
    ({ server, origin } = await startFixture());
    profile = await mkdtemp(path.join(tmpdir(), 'soloflow-chrome-'));
    chrome = spawn(
      'google-chrome',
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--remote-debugging-port=0',
        `--user-data-dir=${profile}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const port = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chrome did not open a debugging port')), 15000);
      const read = (chunk: Buffer) => {
        const match = chunk.toString().match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
        if (!match) return;
        clearTimeout(timer);
        resolve(match[1]);
      };
      chrome.stderr?.on('data', read);
      chrome.stdout?.on('data', read);
    });
    const version = (await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => response.json())) as {
      webSocketDebuggerUrl: string;
    };
    const browser = new Cdp(new WebSocket(version.webSocketDebuggerUrl));
    await new Promise((resolve) => browser['socket'].addEventListener('open', resolve));
    const created = (await browser.send('Target.createTarget', { url: `${origin}/harness` })) as { targetId: string };
    const targets = (await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())) as Array<{
      id: string;
      webSocketDebuggerUrl: string;
    }>;
    const page = targets.find((target) => target.id === created.targetId);
    if (!page) throw new Error('Chrome page target missing');
    cdp = new Cdp(new WebSocket(page.webSocketDebuggerUrl));
    await new Promise((resolve) => cdp['socket'].addEventListener('open', resolve));
    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    await cdp.send('Runtime.enable');
    const ready = (await cdp.send('Runtime.evaluate', {
      expression: 'document.readyState',
      returnByValue: true,
    })) as { result?: { value?: string } };
    if (ready.result?.value !== 'complete') {
      await Promise.race([
        cdp.waitFor('Page.loadEventFired'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Harness page did not load')), 8000)),
      ]);
    }
  }, 30000);

  afterAll(async () => {
    if (chrome && !chrome.killed) {
      chrome.kill();
      await new Promise((resolve) => chrome.once('exit', resolve));
    }
    server?.close();
    if (profile) await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  });

  async function evaluate(expression: string) {
    const result = (await cdp.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })) as { result?: { value?: unknown }; exceptionDetails?: { text?: string } };
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'page script failed');
    }
    return result.result?.value;
  }

  async function openPage(pathname: string) {
    const loaded = cdp.waitFor('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: `${origin}${pathname}` });
    await Promise.race([
      loaded,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out opening ${pathname}`)), 8000)),
    ]);
  }

  async function setOffline(offline: boolean) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline,
      latency: 0,
      downloadThroughput: offline ? 0 : -1,
      uploadThroughput: offline ? 0 : -1,
    });
  }

  it('warms dashboard and invoices, then opens them offline without leaking another account', async () => {
    const controlled = await evaluate(`navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(() => Boolean(navigator.serviceWorker.controller))`);
    if (!controlled) {
      await openPage('/harness');
    }
    const warmed = await evaluate(`(async () => {
      if (!navigator.serviceWorker.controller) throw new Error('service worker is not controlling the page');
      await fetch('/test/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'user_a' }) });
      await fetch('/api/auth/session', { credentials: 'include' });
      await fetch('/dashboard', { headers: { Accept: 'text/html' }, credentials: 'include' });
      await fetch('/invoices', { headers: { Accept: 'text/html' }, credentials: 'include' });
      await fetch('/dashboard', { headers: { Accept: 'text/html', RSC: '1' }, credentials: 'include' });
      const cacheNames = await caches.keys();
      const userCache = cacheNames.find((name) => name.startsWith('soloflow-user-shell-v2:'));
      const cached = userCache ? await caches.open(userCache).then((cache) => cache.match('/dashboard')) : null;
      return { cacheNames, hasDashboard: Boolean(cached), html: cached ? (await cached.text()).slice(0, 80) : '' };
    })()`);
    expect(warmed).toMatchObject({ hasDashboard: true });

    await setOffline(true);
    await openPage('/dashboard');
    expect(await evaluate('document.querySelector("h1") && document.querySelector("h1").textContent')).toBe('dashboard user_a');
    await openPage('/invoices');
    expect(await evaluate('document.querySelector("h1") && document.querySelector("h1").textContent')).toBe('invoices user_a');
    expect(await evaluate(`fetch('/_next/static/chunks/app.js').then((response) => response.status)`)).toBe(200);

    await setOffline(false);
    await evaluate(`fetch('/api/auth/signout', { method: 'POST', credentials: 'include' })`);
    await setOffline(true);
    await openPage('/dashboard');
    const signedOut = String(await evaluate('document.body ? document.body.innerText : ""'));
    expect(signedOut).not.toContain('user_a');
    expect(signedOut.toLowerCase()).toContain('not on this phone');

    await setOffline(false);
    await evaluate(`(async () => {
      await fetch('/test/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'user_b' }) });
      await fetch('/api/auth/session', { credentials: 'include' });
      await fetch('/dashboard', { headers: { Accept: 'text/html' }, credentials: 'include' });
      return true;
    })()`);
    await setOffline(true);
    await openPage('/dashboard');
    expect(await evaluate('document.querySelector("h1") && document.querySelector("h1").textContent')).toBe('dashboard user_b');

    await setOffline(false);
    await evaluate(`(async () => {
      await fetch('/test/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'user_b', exp: ${Math.floor(Date.now() / 1000) - 120} }) });
      await fetch('/api/auth/session', { credentials: 'include' });
      return true;
    })()`);
    await setOffline(true);
    await openPage('/dashboard');
    const expired = String(await evaluate('document.body ? document.body.innerText : ""'));
    expect(expired).not.toContain('user_b');
    expect(await evaluate(`fetch('/_next/static/chunks/app.js').then((response) => response.ok)`)).toBe(true);
  }, 60000);
});
