import html2canvas from 'html2canvas';

async function renderCanvas(element: HTMLElement) {
  let scale = Math.min(1.5, window.devicePixelRatio || 1);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: element.scrollWidth,
      height: element.scrollHeight,
      width: element.scrollWidth,
    });

    if (canvas.height <= 14000 || scale <= 0.5) return canvas;
    scale *= 0.75;
  }

  return html2canvas(element, {
    scale: 0.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: element.scrollWidth,
    height: element.scrollHeight,
    width: element.scrollWidth,
  });
}

export async function waitForImages(root: HTMLElement, timeoutMs = 8000) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, timeoutMs);
        }),
    ),
  );
  await new Promise((resolve) => setTimeout(resolve, 400));
}

async function canvasToPdfFile(canvas: HTMLCanvasElement, filename: string) {
  const { jsPDF } = await import('jspdf');
  const width = canvas.width;
  const height = canvas.height;
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
    compress: true,
  });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, width, height);
  const blob = pdf.output('blob');
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const file = new File([blob], safeName, { type: 'application/pdf' });
  return { file, blob, blobUrl: URL.createObjectURL(blob) };
}

export type PreparedPdf = {
  file: File;
  blob: Blob;
  blobUrl: string;
  filename: string;
};

export async function preparePdfFromElement(
  element: HTMLElement,
  filename: string,
): Promise<PreparedPdf> {
  await waitForImages(element);
  const canvas = await renderCanvas(element);
  const { file, blob, blobUrl } = await canvasToPdfFile(canvas, filename);
  return { file, blob, blobUrl, filename: file.name };
}

export async function captureElementAsPng(element: HTMLElement, filename: string): Promise<File> {
  const canvas = await renderCanvas(element);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('Could not create image'));
    }, 'image/png');
  });

  return new File([blob], filename.endsWith('.png') ? filename : `${filename}.png`, {
    type: 'image/png',
  });
}

export async function captureElementAsPdf(element: HTMLElement, filename: string): Promise<File> {
  const prepared = await preparePdfFromElement(element, filename);
  return prepared.file;
}

export function revokePreparedPdf(prepared: PreparedPdf) {
  URL.revokeObjectURL(prepared.blobUrl);
}

export { savePdfToDevice } from '@/lib/save-pdf-to-device';

export function loadInvoiceCaptureElement(printUrl: string): Promise<{
  element: HTMLElement;
  cleanup: () => void;
}> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;left:-10000px;top:0;width:820px;height:2000px;border:0;opacity:0;pointer-events:none';

    let timeout = 0;

    const cleanup = () => {
      if (timeout) window.clearTimeout(timeout);
      iframe.remove();
    };

    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Invoice took too long to load'));
    }, 25000);

    iframe.onload = () => {
      void (async () => {
        try {
          const doc = iframe.contentDocument;
          if (!doc) throw new Error('Could not read invoice page');

          let element: HTMLElement | null = null;
          for (let attempt = 0; attempt < 50; attempt += 1) {
            element = doc.getElementById('invoice-capture-root');
            if (element && element.offsetHeight > 80) break;
            await new Promise((r) => setTimeout(r, 200));
          }

          if (!element) throw new Error('Invoice content not ready');

          await waitForImages(element);
          resolve({ element, cleanup });
        } catch (error) {
          cleanup();
          reject(error);
        }
      })();
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error('Could not load invoice'));
    };

    document.body.appendChild(iframe);
    iframe.src = printUrl;
  });
}
