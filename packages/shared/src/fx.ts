/** Units of each currency per 1 USD. Example: CNY 7.25 means 1 USD = 7.25 CNY. */
export type FxRates = Record<string, number>;

export const DEFAULT_FX_RATES: FxRates = {
  USD: 1,
  CNY: 7.25,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.55,
  INR: 83,
};

export function parseFxRates(value: unknown): FxRates {
  const base = { ...DEFAULT_FX_RATES };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  for (const [code, rate] of Object.entries(value as Record<string, unknown>)) {
    const n = typeof rate === 'number' ? rate : Number(rate);
    if (code && Number.isFinite(n) && n > 0) {
      base[code.toUpperCase()] = n;
    }
  }
  base.USD = 1;
  return base;
}

/** Convert an amount in `currency` into USD. */
export function toUsd(amount: number, currency: string, rates: FxRates = DEFAULT_FX_RATES): number {
  const code = (currency || 'USD').toUpperCase();
  const rate = rates[code] ?? DEFAULT_FX_RATES[code] ?? 1;
  if (!Number.isFinite(amount) || rate <= 0) return 0;
  return amount / rate;
}

/** Convert a USD amount into `currency`. */
export function fromUsd(amountUsd: number, currency: string, rates: FxRates = DEFAULT_FX_RATES): number {
  const code = (currency || 'USD').toUpperCase();
  const rate = rates[code] ?? DEFAULT_FX_RATES[code] ?? 1;
  if (!Number.isFinite(amountUsd) || rate <= 0) return 0;
  return amountUsd * rate;
}

/** Convert an amount from one currency into another via USD. */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRates = DEFAULT_FX_RATES,
): number {
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  return fromUsd(toUsd(amount, from, rates), to, rates);
}

export function usdToCny(amountUsd: number, rates: FxRates = DEFAULT_FX_RATES): number {
  return fromUsd(amountUsd, 'CNY', rates);
}

export function cnyToUsd(amountCny: number, rates: FxRates = DEFAULT_FX_RATES): number {
  return toUsd(amountCny, 'CNY', rates);
}

/** Convert CNY amount into another currency via USD. */
export function cnyToCurrency(amountCny: number, currency: string, rates: FxRates = DEFAULT_FX_RATES): number {
  return convertCurrency(amountCny, 'CNY', currency, rates);
}

/** Convert an amount in `currency` into CNY via USD. */
export function currencyToCny(amount: number, currency: string, rates: FxRates = DEFAULT_FX_RATES): number {
  return convertCurrency(amount, currency, 'CNY', rates);
}

export function normalizeCostCurrency(value: unknown, fallback = 'CNY'): string {
  if (typeof value !== 'string' || !value.trim()) return fallback.toUpperCase();
  return value.trim().toUpperCase();
}

export function roundMoney(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
