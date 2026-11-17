// Code 128 symbol widths in value order, including the stop symbol.
const patterns = `212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212
112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131
311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321
112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121
313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111
314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114
122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212
124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113
114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112`.split(/\s+/);

// Saturated bar colors stay dark enough to contrast with the white background.
const colors = ['#d00055', '#ab4100', '#876000', '#007847', '#006b87', '#164ad1', '#7700c2'];

export function buildInvoiceBarcode(number: string, id: string) {
  // Use the record ID when a custom invoice number is outside Code 128-B.
  const value = /^[ -~]+$/.test(number) ? number : id;
  const data = Array.from(value, (character) => character.charCodeAt(0) - 32);
  const start = 104;
  const checksum = (start + data.reduce((sum, code, index) => sum + code * (index + 1), 0)) % 103;
  const bars: string[] = [];
  let x = 10;

  for (const code of [start, ...data, checksum, 106]) {
    Array.from(patterns[code], (digit, index) => {
      const width = Number(digit);
      if (index % 2 === 0) bars.push(`M${x} 0h${width}v23h-${width}z`);
      x += width;
    });
  }

  const bands = colors.map((fill) => ({ fill, path: '' }));
  // Seed the shuffle with the encoded value so reprints look the same.
  let seed = data.reduce((hash, code) => Math.imul(hash ^ code, 16777619), 2166136261);
  let colorIndex = bands.length - 1;
  for (const bar of bars) {
    seed = Math.imul(seed, 1664525) + 1013904223;
    const offset = ((seed >>> 16) % (bands.length - 1)) + 1;
    colorIndex = (colorIndex + offset) % bands.length;
    bands[colorIndex].path += bar;
  }

  const modules = x + 10;
  return { value, bands, viewBox: `0 0 ${modules} 23`, width: Math.min(240, Math.max(108, modules * 0.95)) };
}
