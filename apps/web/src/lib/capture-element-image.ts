import html2canvas from 'html2canvas';

export async function captureElementAsPng(element: HTMLElement, filename: string): Promise<File> {
  const canvas = await html2canvas(element, {
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('Could not create image'));
    }, 'image/png');
  });

  return new File([blob], filename, { type: 'image/png' });
}
