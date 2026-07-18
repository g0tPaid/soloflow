/** Units of each currency per 1 USD. Example: CNY 7.25 means 1 USD = 7.25 CNY. */
export type FxRates = Record<string, number>;

export const DEFAULT_FX_RATES: FxRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 157,
  CNY: 7.25,
  INR: 83,
  AUD: 1.55,
  CAD: 1.37,
  CHF: 0.89,
  HKD: 7.82,
  SGD: 1.35,
  NZD: 1.68,
  SEK: 10.5,
  NOK: 10.8,
  DKK: 6.9,
  PLN: 3.95,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.38,
  TRY: 32.5,
  ZAR: 18.5,
  BRL: 5.1,
  MXN: 17.2,
  KRW: 1380,
  TWD: 32.5,
  THB: 36.5,
  MYR: 4.7,
  IDR: 16200,
  PHP: 58,
  VND: 25400,
  PKR: 278,
  BDT: 110,
  LKR: 300,
  EGP: 48,
  NGN: 1550,
  ILS: 3.7,
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

/** Like convertCurrency, but skips conversion when exchange rates are disabled. */
export function convertCurrencyMaybe(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRates = DEFAULT_FX_RATES,
  fxEnabled = true,
): number {
  if (!fxEnabled) return Number.isFinite(amount) ? amount : 0;
  return convertCurrency(amount, fromCurrency, toCurrency, rates);
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
