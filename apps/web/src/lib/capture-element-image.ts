import html2canvas from 'html2canvas';

function cloneForCapture(element: HTMLElement): { clone: HTMLElement; cleanup: () => void } {
  const clone = element.cloneNode(true) as HTMLElement;
  const wrapper = document.createElement('div');
  const width = Math.max(element.scrollWidth, element.clientWidth, 320);
  wrapper.style.cssText = [
    'position:fixed',
    'left:-20000px',
    'top:0',
    'z-index:-1',
    'background:#ffffff',
    `width:${width}px`,
    'pointer-events:none',
    'overflow:visible',
  ].join(';');
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return {
    clone,
    cleanup: () => wrapper.remove(),
  };
}

async function renderCanvas(element: HTMLElement) {
  const { clone, cleanup } = cloneForCapture(element);

  try {
    await waitForImages(clone);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const width = Math.max(clone.scrollWidth, clone.clientWidth, 320);
    const height = Math.max(clone.scrollHeight, clone.clientHeight, 200);
    let scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const canvas = await html2canvas(clone, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
      });

      if (canvas.width > 0 && canvas.height > 0) {
        if (canvas.height <= 14000 || scale <= 0.75) return canvas;
      }
      scale *= 0.75;
    }

    return html2canvas(clone, {
      scale: 0.75,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
    });
  } finally {
    cleanup();
  }
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
  const previewUrl = canvas.toDataURL('image/jpeg', 0.92);
  const imgData = previewUrl;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const blob = pdf.output('blob');
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const file = new File([blob], safeName, { type: 'application/pdf' });
  return { file, blob, blobUrl: URL.createObjectURL(blob), previewUrl };
}

export type PreparedPdf = {
  file: File;
  blob: Blob;
  blobUrl: string;
  previewUrl: string;
  filename: string;
};

export async function preparePdfFromElement(
  element: HTMLElement,
  filename: string,
): Promise<PreparedPdf> {
  if (element.offsetHeight < 40) {
    throw new Error('Document not ready yet');
  }

  await waitForImages(element);
  const canvas = await renderCanvas(element);

  if (canvas.width < 10 || canvas.height < 10) {
    throw new Error('Could not capture document');
  }

  const { file, blob, blobUrl, previewUrl } = await canvasToPdfFile(canvas, filename);
  return { file, blob, blobUrl, previewUrl, filename: file.name };
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
