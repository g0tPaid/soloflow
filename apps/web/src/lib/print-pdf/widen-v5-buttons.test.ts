import { describe, expect, it } from 'vitest';
import { widenV5Button } from './widen-v5-buttons';

describe('Invoice 5 button shape', () => {
  it('never repeats the white stroke of the Wise e into a long horizontal streak', () => {
    const width = 500, height = 114;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const whiteLetter = x >= 170 && x <= 197 && y >= 46 && y <= 54;
        const separator = x >= 208 && x <= 209 && y >= 29 && y <= 83;
        const payLetter = x >= 239 && x <= 252 && y >= 40 && y <= 64;
        pixels[offset] = whiteLetter || payLetter ? 247 : separator ? 126 : 10;
        pixels[offset + 1] = whiteLetter || payLetter ? 252 : separator ? 164 : 61;
        pixels[offset + 2] = whiteLetter || payLetter ? 248 : separator ? 128 : 27;
        pixels[offset + 3] = 255;
      }
    }
    const result = widenV5Button(pixels, width, height, 'wise');
    const countWhite = (arr: Uint8Array, w: number, y: number) => {
      let total = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (arr[i] > 230 && arr[i + 1] > 230 && arr[i + 2] > 230) total++;
      }
      return total;
    };
    // Every white pixel in the complete source must occur exactly once
    // after widening; in particular, the white horizontal e is not duplicated.
    expect(countWhite(result.pixels, result.width, 50)).toBe(countWhite(pixels, width, 50));
    expect(result.width).toBeGreaterThan(width);
  });


  it('removes the translucent white-looking edge fringe on Wise without affecting the separator', () => {
    const width = 100, height = 20;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const divider = x === 50 && y >= 5 && y < 15;
        pixels.set(divider ? [245, 245, 245, 255] : [9, 61, 28, 255], i);
        if (y === 0 || y === height - 2) pixels[i + 3] = 66;
        if (y === height - 1) pixels[i + 3] = 0;
      }
    }
    const result = widenV5Button(pixels, width, height, 'wise');
    const x = Math.floor(result.width / 2);
    expect(result.pixels[(x * 4) + 3]).toBe(255);
    expect(result.pixels[((height - 2) * result.width + x) * 4 + 3]).toBe(255);
    expect(result.pixels[((height - 1) * result.width + x) * 4 + 3]).toBe(0);
    // Original internal divider is retained, not erased by the perimeter fix.
    expect(result.pixels[((8 * result.width + 50 + (result.width - width)) * 4)]).toBe(245);
  });


  for (const [kind, width, height, seam1, seam2] of [
    ['wise', 500, 114, 0.398, 0.448],
    ['download', 500, 101, 0.514, 0.69],
  ] as const) {
    it(`widens ${kind} without changing the original logos, letters or rounded corners`, () => {
      const pixels = new Uint8Array(width * height * 4);
      // Distinct source pixels let this test detect any distorted/cut lettering.
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          // A distinct, dark-green sample in each column (matching the
          // real gaps in the Wise artwork) without arbitrary white letters.
          pixels[i] = x % 50;
          pixels[i + 1] = 70 + Math.floor(x / 50);
          pixels[i + 2] = y % 30;
          pixels[i + 3] = (x === 0 || x === width - 1) ? 0 : 255;
        }
      }

      const art = widenV5Button(pixels, width, height, kind);
      const extra = art.width - width;
      const firstExtra = Math.floor(extra / 2);
      expect(art.width).toBe(Math.round(height * (174 / 30)));
      expect(art.height).toBe(height);
      const at = (x: number, y: number, stride: number) => (y * stride + x) * 4;
      // Both sides and the entire letters between seams stay byte-for-byte intact.
      for (const y of [0, Math.floor(height / 2), height - 1]) {
        for (const x of [0, 1, Math.round(width * seam1) - 1, Math.round(width * seam1) + 1,
          Math.round(width * seam2) - 1, Math.round(width * seam2) + 1, width - 2, width - 1]) {
          const shifted = x < Math.round(width * seam1) ? x
            : x < Math.round(width * seam2) ? x + firstExtra : x + extra;
          expect(Array.from(art.pixels.subarray(at(shifted, y, art.width), at(shifted, y, art.width) + 4)))
            .toEqual(Array.from(pixels.subarray(at(x, y, width), at(x, y, width) + 4)));
        }
      }
      expect(art.pixels[3]).toBe(0);
      expect(art.pixels[at(art.width - 1, 0, art.width) + 3]).toBe(0);
    });
  }
});
