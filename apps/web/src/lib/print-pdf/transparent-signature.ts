import type { Organization } from '@/lib/api';
import { parseBranding } from '@/lib/organization-branding';

export function removeWhiteSignaturePixels(pixels: Uint8Array | Uint8ClampedArray) {
  for (let i = 0; i < pixels.length; i += 4) {
    const lightest = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
    const darkest = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (darkest >= 235 && lightest - darkest <= 12) {
      pixels[i + 3] = Math.round(pixels[i + 3] * (250 - Math.min(darkest, 250)) / 15);
    }
  }
}

export async function prepareTransparentSignature(
  org: Organization,
  convert: (source: string) => Promise<string | undefined>,
): Promise<Organization> {
  if (!org.settings) return org;
  const branding = parseBranding(org.settings.branding);
  if (!branding.invoiceSignature) return org;

  try {
    const signature = await convert(branding.invoiceSignature);
    if (!signature) return org;
    return {
      ...org,
      settings: { ...org.settings, branding: { ...branding, invoiceSignature: signature } },
    };
  } catch {
    return org;
  }
}
