import type { OrganizationBranding } from '@/lib/api';

export const DEFAULT_INVOICE_ACCENT = '#DC2626';

export const INVOICE_ACCENT_PRESETS = [
  { label: 'Red', value: '#DC2626' },
  { label: 'Blue', value: '#2563EB' },
  { label: 'Green', value: '#059669' },
  { label: 'Orange', value: '#EA580C' },
  { label: 'Purple', value: '#7C3AED' },
  { label: 'Teal', value: '#0D9488' },
  { label: 'Slate', value: '#475569' },
] as const;

export type InvoiceAccentPalette = {
  accent: string;
  light: string;
  dark: string;
  softBorder: string;
  softBg: string;
  mutedOnDark: string;
};

function mixChannel(channel: number, target: number, amount: number) {
  return Math.round(channel + (target - channel) * amount);
}

function mixHex(hex: string, target: number, amount: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(mixChannel(r, target, amount))}${toHex(mixChannel(g, target, amount))}${toHex(mixChannel(b, target, amount))}`;
}

export function normalizeInvoiceAccent(value?: string | null): string {
  if (!value || typeof value !== 'string') return DEFAULT_INVOICE_ACCENT;
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  return DEFAULT_INVOICE_ACCENT;
}

export function invoiceAccentPalette(value?: string | null): InvoiceAccentPalette {
  const accent = normalizeInvoiceAccent(value);
  return {
    accent,
    light: mixHex(accent, 255, 0.88),
    dark: mixHex(accent, 0, 0.38),
    softBorder: mixHex(accent, 255, 0.72),
    softBg: mixHex(accent, 255, 0.94),
    mutedOnDark: mixHex(accent, 255, 0.55),
  };
}

/** Show uploaded logo on invoices unless the company turned it off. */
export function shouldShowInvoiceLogo(
  branding: OrganizationBranding | undefined,
  logo?: string | null,
): boolean {
  if (!logo) return false;
  return branding?.showInvoiceLogo !== false;
}

export function formatAddressLines(address?: OrganizationBranding['address']): string[] {
  if (!address) return [];
  const cityLine = [address.city, address.state].filter(Boolean).join(', ');
  return [address.line1, address.line2, cityLine, address.postalCode, address.country].filter(
    Boolean,
  ) as string[];
}

export function resolveImageSrc(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (typeof window !== 'undefined') {
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${window.location.origin}${path}`;
  }
  return url.startsWith('/') ? url : `/${url}`;
}

export function resolveImageSrcForPrint(
  url: string | null | undefined,
  baseUrl: string,
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

export function parseBranding(raw: unknown): OrganizationBranding {
  if (!raw || typeof raw !== 'object') return {};
  return raw as OrganizationBranding;
}
