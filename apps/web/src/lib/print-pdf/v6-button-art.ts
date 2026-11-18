/**
 * The Version 6 reference uses vivid green and red actions. Keep the original
 * button lettering and silhouettes, but brighten only the colored artwork.
 * Neutral/white lettering and transparent corners remain unchanged.
 */
export function recolorV6Button(
  rgba: Uint8Array | Uint8ClampedArray,
  kind: 'wise' | 'download',
): Uint8Array {
  const out = Uint8Array.from(rgba);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 20) continue;
    const r = out[i], g = out[i + 1], b = out[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    // Preserve logos, white type, and gray separators.
    if (max - min < 32 || min > 155) continue;
    if (kind === 'wise' && g > r * 1.11 && g > b * 0.95) {
      out[i] = Math.min(255, Math.round(r * 0.72));
      out[i + 1] = Math.min(255, Math.round(g * 1.82 + 8));
      out[i + 2] = Math.min(255, Math.round(b * 0.67));
    } else if (kind === 'download' && r > g * 1.16 && r > b * 1.16) {
      out[i] = Math.min(255, Math.round(r * 1.09));
      out[i + 1] = Math.min(255, Math.round(g * 0.65));
      out[i + 2] = Math.min(255, Math.round(b * 0.83 + 4));
    }
  }
  return out;
}
