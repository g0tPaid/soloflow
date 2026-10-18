import type { LineItemInput } from '@/lib/line-items';

const PREFIX = 'soloflow-quote-draft:';

export type QuoteDraft = {
  items: LineItemInput[];
  currency: string;
  shipping: number;
  taxRate: number;
  number: string;
  status?: string;
  validUntil: string;
  notes: string;
  discount: number;
  shippingMethod: 'AIR' | 'SEA' | 'LOCAL' | null;
  shippingTerms: 'DDP' | 'LCL' | 'LOCAL' | null;
  shippingFromCountry: string;
  shippingToCountry: string;
};

export function quoteDraftKey(id: string) {
  return `${PREFIX}${id}`;
}

export function readQuoteDraft(id: string): QuoteDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(quoteDraftKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteDraft;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeQuoteDraft(id: string, draft: QuoteDraft) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(quoteDraftKey(id), JSON.stringify(draft));
  } catch {
    // Private mode or a full disk should not block editing.
  }
}

export function clearQuoteDraft(id: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(quoteDraftKey(id));
  } catch {
    // Ignore storage failures.
  }
}
