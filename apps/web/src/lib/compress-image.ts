function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

function fitWithin(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function dataUrlByteSize(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.ceil((base64.length * 3) / 4);
}

export type CompressImageOptions = {
  maxWidth: number;
  maxHeight: number;
  maxBytes?: number;
  quality?: number;
};

/** Resize and compress an image for storage in the database (keeps requests small on mobile). */
export async function compressImageFile(
  file: File,
  { maxWidth, maxHeight, maxBytes = 450_000, quality = 0.82 }: CompressImageOptions,
): Promise<string> {
  const source = await readFileAsDataUrl(file);
  const img = await loadImage(source);
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxWidth, maxHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image');
  ctx.drawImage(img, 0, 0, width, height);

  let currentQuality = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);

  while (dataUrlByteSize(dataUrl) > maxBytes && currentQuality > 0.45) {
    currentQuality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
  }

  return dataUrl;
}
