import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { loadPrintDocument } from '@/lib/print-pdf/load-print-data';
import { renderPrintHtml } from '@/lib/print-pdf/render-print-html';

const PRINT_ROOTS: Record<string, string> = {
  invoices: 'invoice-capture-root',
  receipts: 'receipt-capture-root',
  expenses: 'expense-capture-root',
};

function resolveBaseUrl(request: Request) {
  const configured = process.env.NEXTAUTH_URL?.replace(/\/$/, '');
  if (configured) return configured;
  return new URL(request.url).origin;
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
  accessToken: string,
  type: string,
  id: string,
  organizationId?: string | null,
): Promise<Buffer> {
  const rootId = PRINT_ROOTS[type];
  if (!rootId) {
    throw new Error('Unsupported document type');
  }

  const baseUrl = resolveBaseUrl(request);
  const printDocument = await loadPrintDocument(accessToken, type, id, organizationId);
  const html = renderPrintHtml(printDocument, baseUrl);

  chromium.setGraphicsMode = false;

  const executablePath = await resolveExecutablePath();
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-sandbox',
    ],
    defaultViewport: { width: 820, height: 1200 },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 90_000 });
    await page.waitForSelector(`#${rootId}`, { timeout: 45_000 });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await page.waitForFunction(
      (selector: string) => {
        const node = globalThis.document.querySelector(selector);
        return !!node && (node as HTMLElement).offsetHeight > 80;
      },
      { timeout: 45_000 },
      `#${rootId}`,
    );

    await page.evaluate(() => globalThis.document.fonts.ready);
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
