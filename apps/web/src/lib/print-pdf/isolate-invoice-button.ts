/**
 * Remove a flattened checkerboard/gray background from a colored, rounded
 * invoice-button image without cutting out its white lettering.
 *
 * A neutral-colored region reachable from the image edge is background.
 * Interior neutral pixels (including white logos, labels and separators)
 * are preserved. This is deterministic and works on both server and browser.
 */
export function isolateInvoiceButton(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): { pixels: Uint8Array; width: number; height: number } {
  const length = width * height;
  if (width < 2 || height < 2 || rgba.length !== length * 4) {
    throw new Error('Invalid invoice button image dimensions');
  }

  const outside = new Uint8Array(length);
  const queue = new Int32Array(length);
  let head = 0;
  let tail = 0;

  const isBackgroundCandidate = (index: number) => {
    const at = index * 4;
    if (rgba[at + 3] < 40) return true;
    const r = rgba[at];
    const g = rgba[at + 1];
    const b = rgba[at + 2];
    return Math.max(r, g, b) - Math.min(r, g, b) <= 36;
  };
  const add = (index: number) => {
    if (outside[index] === 0 && isBackgroundCandidate(index)) {
      outside[index] = 1;
      queue[tail++] = index;
    }
  };

  for (let x = 0; x < width; x++) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    add(y * width);
    add(y * width + width - 1);
  }

  while (head < tail) {
    const current = queue[head++];
    const x = current % width;
    if (x > 0) add(current - 1);
    if (x < width - 1) add(current + 1);
    if (current >= width) add(current - width);
    if (current < length - width) add(current + width);
  }

  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (outside[index] === 0 && rgba[index * 4 + 3] >= 40) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left || bottom < top) throw new Error('Invoice button artwork missing');
  const outWidth = right - left + 1;
  const outHeight = bottom - top + 1;
  const pixels = new Uint8Array(outWidth * outHeight * 4);

  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      const srcIndex = (top + y) * width + left + x;
      const dstIndex = y * outWidth + x;
      const src = srcIndex * 4;
      const dst = dstIndex * 4;
      pixels[dst] = rgba[src];
      pixels[dst + 1] = rgba[src + 1];
      pixels[dst + 2] = rgba[src + 2];
      pixels[dst + 3] = outside[srcIndex] ? 0 : rgba[src + 3];
    }
  }

  return { pixels, width: outWidth, height: outHeight };
}
