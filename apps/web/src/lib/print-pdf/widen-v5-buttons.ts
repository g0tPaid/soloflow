/**
 * Widen the original Invoice 5 pill artwork without stretching any lettering,
 * logos or the rounded ends. Only duplicate background columns in the blank
 * spaces between graphics. Both resulting images have the same natural aspect
 * ratio as the 174 x 30pt slots in the receipt.
 *
 * Do not use this for Invoice 6, which has its own approved button layout.
 */
export function widenV5Button(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  kind: 'wise' | 'download',
): { pixels: Uint8Array; width: number; height: number } {
  if (width < 20 || height < 5 || pixels.length !== width * height * 4) {
    throw new Error('Invalid invoice button artwork');
  }

  const targetWidth = Math.max(width, Math.round(height * (174 / 30)));
  const extra = targetWidth - width;
  if (extra === 0) return { pixels: new Uint8Array(pixels), width, height };

  // Safe empty vertical bands in the supplied original branded artwork.
  const first = Math.round(width * (kind === 'wise' ? 0.378 : 0.514));
  const second = Math.round(width * (kind === 'wise' ? 0.45 : 0.69));
  const firstExtra = Math.floor(extra / 2);
  const secondExtra = extra - firstExtra;
  const result = new Uint8Array(targetWidth * height * 4);

  for (let y = 0; y < height; y++) {
    const fromRow = y * width * 4;
    const toRow = y * targetWidth * 4;
    for (let x = 0; x < targetWidth; x++) {
      const originalX =
        x < first ? x
        : x < first + firstExtra ? first
        : x < second + firstExtra ? x - firstExtra
        : x < second + firstExtra + secondExtra ? second
        : x - extra;
      const src = fromRow + originalX * 4;
      const dest = toRow + x * 4;
      result[dest] = pixels[src];
      result[dest + 1] = pixels[src + 1];
      result[dest + 2] = pixels[src + 2];
      result[dest + 3] = pixels[src + 3];
    }
  }
  // The supplied Wise PNG has a semi-transparent fringe along its straight
  // top and bottom edges. PDF scaling exposes it as a thin white hairline.
  // Replace only those two fringe rows with neighboring opaque green artwork.
  // Keep the rounded ends, the internal white divider, and all lettering intact.
  if (kind === 'wise' && height > 8) {
    const inset = Math.ceil(height * 0.28);
    for (let x = inset; x < targetWidth - inset; x++) {
      for (const [edgeRow, interiorRow] of [[0, 1], [height - 2, height - 3]]) {
        const at = (edgeRow * targetWidth + x) * 4;
        const sample = (interiorRow * targetWidth + x) * 4;
        if (result[at + 3] < 240 && result[sample + 3] >= 240) {
          result[at] = result[sample];
          result[at + 1] = result[sample + 1];
          result[at + 2] = result[sample + 2];
          result[at + 3] = result[sample + 3];
        }
      }
    }
  }

  return { pixels: result, width: targetWidth, height };
}
