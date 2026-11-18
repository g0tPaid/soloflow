import { describe, expect, it } from 'vitest';
import { isolateInvoiceButton } from './isolate-invoice-button';

describe('isolateInvoiceButton', () => {
  it('removes the checkerboard around a rounded button without cutting off white text', () => {
    const width = 120;
    const height = 48;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const gray = ((x + y) & 1) ? 210 : 232;
        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;
        pixels[i + 3] = 255;

        const inside = x >= 10 && x <= 109 && y >= 8 && y <= 39 &&
          !((x < 17 || x > 102) && (y < 13 || y > 34));
        if (inside) {
          const isLetter = x >= 30 && x <= 90 && y >= 18 && y <= 27;
          pixels[i] = isLetter ? 255 : 14;
          pixels[i + 1] = isLetter ? 255 : 78;
          pixels[i + 2] = isLetter ? 255 : 41;
        }
      }
    }

    const clean = isolateInvoiceButton(pixels, width, height);
    expect(clean.width).toBe(100);
    expect(clean.height).toBe(32);
    const at = (x: number, y: number) => (y * clean.width + x) * 4;
    expect(clean.pixels[at(0, 0) + 3]).toBe(0); // corner removed
    expect(clean.pixels[at(20, 15) + 3]).toBe(255); // white text retained
    expect(clean.pixels[at(20, 15)]).toBe(255);
    expect(clean.pixels[at(50, 2) + 3]).toBe(255); // green top retained
    expect(clean.pixels[at(50, 29) + 3]).toBe(255); // green bottom retained
  });
});
