import type { OrganizationBranding } from '@/lib/api';

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
