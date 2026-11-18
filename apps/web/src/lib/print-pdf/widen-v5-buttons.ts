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

  // A hard-coded seam once passed through the final "e" in WISE and
  // repeated its white horizontal stroke across the widened band. Pick both
  // seams from *actual green background pixels* so letters cannot be copied.
  const chooseWiseSeam = (targetRatio: number, leftRatio: number, rightRatio: number) => {
    const target = Math.round(width * targetRatio);
    const start = Math.max(2, Math.round(width * leftRatio));
    const end = Math.min(width - 3, Math.round(width * rightRatio));
    let best = target;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let x = start; x <= end; x++) {
      let score = Math.abs(x - target) * 2;
      for (let y = Math.round(height * 0.27); y < Math.round(height * 0.73); y++) {
        for (let dx = -2; dx <= 2; dx++) {
          const at = (y * width + x + dx) * 4;
          const red = pixels[at], green = pixels[at + 1], blue = pixels[at + 2];
          const brightness = Math.max(red, green, blue);
          // Real empty button space is solid dark green. Pale strokes,
          // separator pixels, bright graphics, and transparent edges are not.
          if (brightness > 105 || green < red + 8 || green < blue + 6 || pixels[at + 3] < 200) {
            score += 500;
          }
        }
      }
      if (score < bestScore) {
        bestScore = score;
        best = x;
      }
    }
    // Better to stop than create a broken payment logo on unexpected artwork.
    if (bestScore > width * 0.35 + 100) {
      throw new Error('Unable to find clean green space for Wise button extension');
    }
    return best;
  };
  const first = kind === 'wise'
    ? chooseWiseSeam(0.398, 0.36, 0.414)
    : Math.round(width * 0.514);
  const second = kind === 'wise'
    ? chooseWiseSeam(0.448, 0.422, 0.468)
    : Math.round(width * 0.69);
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
