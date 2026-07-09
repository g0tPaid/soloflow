import { cookies } from 'next/headers';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const PRINT_ROOTS: Record<string, string> = {
  invoices: 'invoice-capture-root',
  receipts: 'receipt-capture-root',
  expenses: 'expense-capture-root',
};

function resolveBaseUrl(request: Request) {
  return new URL(request.url).origin;
}

async function authCookiesForBrowser(baseUrl: string) {
  const cookieStore = await cookies();
  const hostname = new URL(baseUrl).hostname;
  const secure = baseUrl.startsWith('https');

  return cookieStore.getAll().map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: hostname,
    path: '/',
    secure,
    httpOnly: true,
    sameSite: 'Lax' as const,
  }));
}

async function resolveExecutablePath() {
  if (process.env.CHROME_PATH?.trim()) {
    return process.env.CHROME_PATH.trim();
  }

  if (process.env.NODE_ENV === 'development') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];
    for (const path of candidates) {
      try {
        const fs = await import('node:fs');
        if (fs.existsSync(path)) return path;
      } catch {
        // ignore
      }
    }
  }

  return chromium.executablePath();
}

export async function generatePrintPdf(
  request: Request,
  type: string,
  id: string,
  organizationId?: string | null,
): Promise<Buffer> {
  const rootId = PRINT_ROOTS[type];
  if (!rootId) {
    throw new Error('Unsupported document type');
  }

  const baseUrl = resolveBaseUrl(request);
  const params = new URLSearchParams({ embed: '1' });
  if (organizationId) params.set('org', organizationId);

  const printUrl = `${baseUrl}/print/${type}/${id}?${params.toString()}`;
  const browserCookies = await authCookiesForBrowser(baseUrl);

  const executablePath = await resolveExecutablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 820, height: 1200 },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    if (browserCookies.length > 0) {
      await page.setCookie(...browserCookies);
    }

    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 90_000 });
    await page.waitForSelector(`#${rootId}`, { timeout: 45_000 });
    await page.waitForFunction(
      (selector: string) => {
        const node = document.querySelector(selector);
        return !!node && (node as HTMLElement).offsetHeight > 80;
      },
      { timeout: 45_000 },
      `#${rootId}`,
    );

    await page.emulateMediaType('print');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
