import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BRAND = [0xe4, 0x00, 0x46, 255];
const WHITE = [255, 255, 255, 255];

const GLYPHS = {
  S: ['01110', '10001', '10000', '01110', '00001', '10001', '01110'],
  F: ['11111', '10000', '11110', '10000', '10000', '10000', '10000'],
};

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inRoundRect(x, y, size, radius) {
  const r = radius;
  const checks = [
    [r, r],
    [size - r, r],
    [r, size - r],
    [size - r, size - r],
  ];
  const insideCorner =
    (x < r && y < r) ||
    (x >= size - r && y < r) ||
    (x < r && y >= size - r) ||
    (x >= size - r && y >= size - r);
  if (!insideCorner) return true;
  return checks.some(([cx, cy]) => {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r && x >= cx - r && y >= cy - r && x <= cx + r && y <= cy + r;
  });
}

function paintIcon(x, y, size, { rounded, letterScale }) {
  const radius = rounded ? Math.round(size * 0.18) : 0;
  if (rounded && !inRoundRect(x, y, size, radius)) return [0, 0, 0, 0];
  const scale = letterScale;
  const glyphW = 5 * scale;
  const gap = scale;
  const totalW = glyphW * 2 + gap;
  const totalH = 7 * scale;
  const originX = Math.round((size - totalW) / 2);
  const originY = Math.round((size - totalH) / 2);
  const localX = x - originX;
  const localY = y - originY;
  if (localX < 0 || localY < 0 || localX >= totalW || localY >= totalH) return BRAND;
  const glyphIndex = localX < glyphW ? 0 : localX >= glyphW + gap ? 1 : -1;
  if (glyphIndex < 0) return BRAND;
  const glyph = glyphIndex === 0 ? GLYPHS.S : GLYPHS.F;
  const gx = Math.floor((localX - (glyphIndex === 0 ? 0 : glyphW + gap)) / scale);
  const gy = Math.floor(localY / scale);
  if (glyph[gy] && glyph[gy][gx] === '1') return WHITE;
  return BRAND;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../public/icons');
mkdirSync(outDir, { recursive: true });

const files = [
  ['icon-192.png', 192, { rounded: true, letterScale: 14 }],
  ['icon-512.png', 512, { rounded: true, letterScale: 36 }],
  ['apple-touch-icon.png', 180, { rounded: false, letterScale: 12 }],
  ['icon-maskable-512.png', 512, { rounded: false, letterScale: 28 }],
];

for (const [name, size, options] of files) {
  writeFileSync(join(outDir, name), png(size, (x, y, s) => paintIcon(x, y, s, options)));
}
