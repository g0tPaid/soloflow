'use client';

import { ChevronDown } from 'lucide-react';
import { CURRENCIES } from '@flowbooks/shared';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const PREFERRED_CODES = ['USD', 'AED', 'CNY', 'EUR', 'GBP', 'INR'] as const;

function optionLabel(currency: { code: string; symbol: string; name: string }) {
  return `${currency.symbol} ${currency.code} — ${currency.name}`;
}

export function CurrencySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
}) {
  const current = (value || 'USD').toUpperCase();
  const preferredCodes = new Set<string>(PREFERRED_CODES);
  const preferred = PREFERRED_CODES.map((code) => CURRENCIES.find((currency) => currency.code === code)).filter(
    (currency): currency is (typeof CURRENCIES)[number] => !!currency,
  );
  const rest = CURRENCIES.filter((currency) => !preferredCodes.has(currency.code));
  const known = CURRENCIES.some((currency) => currency.code === current);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Currency</Label>
      <div className="relative">
        <select
          id={id}
          aria-label="Currency"
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-10 text-sm shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          value={current}
          onChange={(event) => onChange(event.target.value)}
        >
          {!known && <option value={current}>{current}</option>}
          <optgroup label="Common">
            {preferred.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {optionLabel(currency)}
              </option>
            ))}
          </optgroup>
          <optgroup label="All currencies">
            {rest.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {optionLabel(currency)}
              </option>
            ))}
          </optgroup>
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  );
}
