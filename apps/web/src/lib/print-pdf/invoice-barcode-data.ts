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

// Dark rainbow shades preserve contrast against the white quiet zones.
const colors = ['#9f1239', '#a03d09', '#725500', '#14643a', '#075c72', '#32428f', '#63247c'];

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
  bars.forEach((bar, index) => {
    bands[Math.floor(index * bands.length / bars.length)].path += bar;
  });

  const modules = x + 10;
  return { value, bands, viewBox: `0 0 ${modules} 23`, width: Math.min(240, Math.max(108, modules * 0.95)) };
}
